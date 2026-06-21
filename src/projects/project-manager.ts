import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAccount } from '../accounts/account-manager.js';
import { addHistoryEntry } from '../history/history-store.js';

/**
 * A project links a video URL to a comment template and a TikTok account.
 */
export interface Project {
  id: string;
  name: string;
  videoUrl: string;
  commentTemplate: string;
  accountId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  commentsPosted: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_FILE = resolve(process.cwd(), 'projects.json');

let projects: Project[] = [];

/**
 * Load projects from disk.
 */
export function loadProjects(): void {
  try {
    if (existsSync(PROJECTS_FILE)) {
      const raw = readFileSync(PROJECTS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      projects = Array.isArray(data) ? data : [];
    }
  } catch {
    projects = [];
  }
}

/**
 * Persist projects to disk.
 */
function persist(): void {
  try {
    writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

/**
 * Get all projects.
 */
export function getProjects(): Project[] {
  return [...projects];
}

/**
 * Get a single project by ID.
 */
export function getProject(id: string): Project | null {
  return projects.find(p => p.id === id) || null;
}

/**
 * Create a new project.
 */
export function createProject(
  name: string,
  videoUrl: string,
  commentTemplate: string,
  accountId: string
): Project {
  const project: Project = {
    id: randomUUID(),
    name: name.trim(),
    videoUrl: videoUrl.trim(),
    commentTemplate: commentTemplate.trim(),
    accountId,
    status: 'idle',
    commentsPosted: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  persist();
  return project;
}

/**
 * Update a project.
 */
export function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'videoUrl' | 'commentTemplate' | 'accountId'>>
): Project | null {
  const project = projects.find(p => p.id === id);
  if (!project) return null;

  if (updates.name !== undefined) project.name = updates.name.trim();
  if (updates.videoUrl !== undefined) project.videoUrl = updates.videoUrl.trim();
  if (updates.commentTemplate !== undefined) project.commentTemplate = updates.commentTemplate.trim();
  if (updates.accountId !== undefined) project.accountId = updates.accountId;
  project.updatedAt = new Date().toISOString();

  persist();
  return project;
}

/**
 * Delete a project.
 */
export function deleteProject(id: string): boolean {
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return false;
  projects.splice(idx, 1);
  persist();
  return true;
}

/**
 * Run a project — generates a comment using OpenAI and posts it.
 * This simulates the auto-comment flow.
 */
export async function runProject(id: string): Promise<{ success: boolean; message: string }> {
  const project = projects.find(p => p.id === id);
  if (!project) return { success: false, message: 'Project not found' };

  const account = getAccount(project.accountId);
  if (!account) return { success: false, message: 'Linked account not found' };

  // Update status
  project.status = 'running';
  project.lastRunAt = new Date().toISOString();
  persist();

  try {
    // Generate comment using OpenAI
    const generatedComment = await generateComment(
      account.openaiApiKey,
      project.commentTemplate,
      project.videoUrl
    );

    // Post the comment (simulated via proxy)
    const postResult = await postComment(
      project.videoUrl,
      generatedComment,
      account.proxy
    );

    if (postResult.success) {
      project.status = 'completed';
      project.commentsPosted++;
      persist();

      // Log to history
      addHistoryEntry({
        projectId: project.id,
        projectName: project.name,
        videoUrl: project.videoUrl,
        commentUsed: generatedComment,
        accountNickname: account.nickname,
        status: 'completed',
        details: 'Comment posted successfully',
      });

      return { success: true, message: `Comment posted: "${generatedComment.substring(0, 50)}..."` };
    } else {
      project.status = 'failed';
      persist();

      addHistoryEntry({
        projectId: project.id,
        projectName: project.name,
        videoUrl: project.videoUrl,
        commentUsed: generatedComment,
        accountNickname: account.nickname,
        status: 'failed',
        details: postResult.error || 'Failed to post comment',
      });

      return { success: false, message: postResult.error || 'Failed to post comment' };
    }
  } catch (error) {
    project.status = 'failed';
    persist();

    const errorMsg = error instanceof Error ? error.message : String(error);

    addHistoryEntry({
      projectId: project.id,
      projectName: project.name,
      videoUrl: project.videoUrl,
      commentUsed: '',
      accountNickname: account.nickname,
      status: 'failed',
      details: errorMsg,
    });

    return { success: false, message: errorMsg };
  }
}

/**
 * Generate a comment using OpenAI API.
 */
async function generateComment(
  apiKey: string,
  template: string,
  videoUrl: string
): Promise<string> {
  const prompt = `You are a TikTok commenter. Based on this comment template/style, generate a single natural-sounding comment for a TikTok video.

Template/Style: ${template}
Video URL: ${videoUrl}

Generate exactly one comment. Keep it short (under 150 characters), natural, and engaging. Do not include quotes or extra formatting. Just the comment text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const comment = data.choices?.[0]?.message?.content?.trim();
  if (!comment) throw new Error('OpenAI returned empty response');

  return comment;
}

/**
 * Post a comment on a TikTok video.
 * NOTE: TikTok does not have a public comment API, so this is a placeholder
 * that would integrate with a browser automation tool or unofficial API.
 * For now, it simulates success so the flow is testable.
 */
async function postComment(
  _videoUrl: string,
  _comment: string,
  _proxy: string
): Promise<{ success: boolean; error?: string }> {
  // TODO: Integrate with actual TikTok commenting mechanism
  // Options: Puppeteer/Playwright with proxy, unofficial API, etc.
  // For now, simulate a successful post
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}
