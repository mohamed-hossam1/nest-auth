import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'openid-client';

@Injectable()
export class GoogleOauthLoginService {
  private oauthConfig: client.Configuration | null = null;

  constructor(private readonly configService: ConfigService) {}

  private async getOAuthConfig(): Promise<client.Configuration> {
    if (this.oauthConfig) {
      return this.oauthConfig;
    }

    const issuerUrl = new URL('https://accounts.google.com');
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'GOOGLE_CLIENT_SECRET',
    );

    this.oauthConfig = await client.discovery(
      issuerUrl,
      clientId,
      clientSecret,
    );

    return this.oauthConfig;
  }

  async generateAuthParams() {
    const config = await this.getOAuthConfig();
    const redirectUri = this.configService.getOrThrow<string>(
      'GOOGLE_CALLBACK_URL',
    );

    const state = client.randomState();
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

    const authUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    return {
      url: authUrl.toString(),
      state,
      codeVerifier,
    };
  }
}
