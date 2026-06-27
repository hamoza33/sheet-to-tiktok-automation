import { GraphQLClient } from 'graphql-request';
import { IBufferPublisher, PublishResult } from '../types.js';

const BUFFER_API_URL = 'https://api.buffer.com';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

const CREATE_POST_MUTATION = `
  mutation CreatePost($text: String!, $channelId: ChannelId!, $videoUrl: String!) {
    createPost(
      input: {
        text: $text
        channelId: $channelId
        schedulingType: automatic
        mode: shareNow
        assets: [{ video: { url: $videoUrl } }]
      }
    ) {
      ... on PostActionSuccess {
        post {
          id
          text
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

interface CreatePostSuccessResponse {
  createPost: {
    post?: { id: string; text: string };
    message?: string;
  };
}

/**
 * Buffer GraphQL API client for scheduling social media posts.
 * Sends createPost mutations with Bearer token authentication,
 * 30-second timeout, and up to 3 retries with 5-second delay.
 */
export class BufferPublisher implements IBufferPublisher {
  private readonly client: GraphQLClient;
  private readonly profileId: string;

  constructor(accessToken: string, profileId: string) {
    this.profileId = profileId;
    this.client = new GraphQLClient(BUFFER_API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Test the connection to Buffer API using the provided access token.
   * First queries account id/email to verify the token, then separately
   * queries channels. If channels returns FORBIDDEN, still reports success
   * with an empty channels array.
   */
  static async testConnection(accessToken: string): Promise<{ success: boolean; data?: { id: string; email: string; channels: Array<{ id: string; name: string; service: string }> }; error?: string }> {
    const accountQuery = `query { account { id email } }`;
    const channelsQuery = `query { account { channels { id name service } } }`;

    const client = new GraphQLClient(BUFFER_API_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // First, verify the token works by querying account info
    const accountController = new AbortController();
    const accountTimeoutId = setTimeout(() => accountController.abort(), REQUEST_TIMEOUT_MS);

    let accountData: { id: string; email: string };
    try {
      const result = await client.request<{ account: { id: string; email: string } }>({
        document: accountQuery,
        signal: accountController.signal,
      });
      accountData = result.account;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    } finally {
      clearTimeout(accountTimeoutId);
    }

    // Then, try to fetch channels separately
    const channelsController = new AbortController();
    const channelsTimeoutId = setTimeout(() => channelsController.abort(), REQUEST_TIMEOUT_MS);

    let channels: Array<{ id: string; name: string; service: string }> = [];
    try {
      const result = await client.request<{ account: { channels: Array<{ id: string; name: string; service: string }> } }>({
        document: channelsQuery,
        signal: channelsController.signal,
      });
      channels = result.account.channels;
    } catch {
      // Channels query failed (e.g. FORBIDDEN) - continue with empty channels
    } finally {
      clearTimeout(channelsTimeoutId);
    }

    return { success: true, data: { ...accountData, channels } };
  }

  async schedulePost(captionText: string, videoUrl: string): Promise<PublishResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.sendRequest(captionText, videoUrl);

        if (result.createPost.post) {
          return {
            success: true,
            postId: result.createPost.post.id,
            attempts: attempt,
          };
        }

        // MutationError from Buffer API
        lastError = result.createPost.message ?? 'Unknown Buffer API error';
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // Don't delay after the last attempt
      if (attempt < MAX_RETRIES) {
        await this.delay(RETRY_DELAY_MS);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: MAX_RETRIES,
    };
  }

  private async sendRequest(captionText: string, videoUrl: string): Promise<CreatePostSuccessResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await this.client.request<CreatePostSuccessResponse>({
        document: CREATE_POST_MUTATION,
        variables: {
          text: captionText,
          channelId: this.profileId,
          videoUrl,
        },
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
