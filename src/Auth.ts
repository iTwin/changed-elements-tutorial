/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import type { BrowserAuthorizationClientConfiguration } from "@itwin/browser-authorization";
import { BrowserAuthorizationClient } from "@itwin/browser-authorization";

export class Auth {
  private static _client: BrowserAuthorizationClient;

  public static initialize(
    options: BrowserAuthorizationClientConfiguration
  ): BrowserAuthorizationClient {
    if (!this._client) {
      this._client = new BrowserAuthorizationClient(options);
    }

    return this._client;
  }

  public static getClient(): BrowserAuthorizationClient {
    if (!this._client) {
      throw new Error(
        "Client not initialized. Please call `Auth.initialize(BrowserAuthorizationClientConfiguration)`"
      );
    }
    return this._client;
  }

  public static async handleSigninCallback(): Promise<void> {
    if (!this._client) {
      throw new Error(
        "Client not initialized. Please call `Auth.initialize(BrowserAuthorizationClientConfiguration)`"
      );
    }
  
    // Extract the "code" from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get("code");
  
    if (!authCode) {
      console.error("Authorization code not found in redirect URL.");
      return;
    }
  
    console.log("Authorization Code:", authCode);
  
    // Handle the authentication response
    await this._client.handleSigninCallback();
  }
  
}
