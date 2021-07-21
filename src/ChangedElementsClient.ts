/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { ChangedElements } from "@bentley/imodeljs-common";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { AccessToken, AuthorizedClientRequestContext, IncludePrefix, request, RequestOptions } from "@bentley/itwin-client";
import { AuthorizationClient } from "./AuthorizationClient";

/**
 * Class for using the Changed Elements API
 */
export class ChangedElementsClient {
  /**
   * Get base URL for changed elements API
   * @returns URL for changed elements API
   */
  public getUrl() {
    return "https://api.bentley.com/changedelements";
  }

  /**
   * Function to form the URL for the comparison operation of changed elements API
   * @param iModelId iModel Id to query for
   * @param projectId Project Id of the iModel
   * @param startChangesetId Start changeset for comparison data
   * @param endChangesetId End changeset for comparison data
   * @returns Url for querying changed elements from the changed elements API
   */
  public getComparisonOperationUrl(
    iModelId: string,
    projectId: string,
    startChangesetId: string,
    endChangesetId: string
  ) {
    return this.getUrl() +
      "/comparison?iModelId=" + iModelId +
      "&projectId=" + projectId +
      "&startChangesetId=" + startChangesetId +
      "&endChangesetId=" + endChangesetId;
  }

  /**
   * Function to form the URL for the enable change tracking operation of changed elements API
   * @returns Url for enabling/disabling change tracking
   */
  public getEnableChangeTrackingUrl() {
    return this.getUrl() + "/tracking"
  }

  /**
   * Tries to get an access token from the authorization client
   * Should work if your .env is setup properly and your application's client
   * is setup correctly
   * @returns AccessToken or undefined
   */
  private async getAccessToken(): Promise<AccessToken | undefined> {
    try {
      return await AuthorizationClient.apimClient.getAccessToken();
    } catch(e) {
      console.error(e);
      return undefined;
    }
  }

  /**
   * Headers for requests
   * @param requestContext 
   * @returns 
   */
  public getHeaderOptions(accessToken: AccessToken) {
    return {
      Authorization: accessToken.toTokenString(IncludePrefix.Yes),
    }
  }

  /**
   * Gets the changed elements between two changesets using the changed elements API
   * This results in a GET request to the comparison endpoint
   * @param iModel iModel to test
   * @param startChangesetId Start changeset Id
   * @param endChangesetId End changeset Id
   * @returns ChangedElements object or undefined
   */
  public async getComparison(
    iModel: IModelConnection,
    startChangesetId: string,
    endChangesetId: string
  ): Promise<ChangedElements | undefined> {
    const accessToken = await this.getAccessToken();
    if (accessToken === undefined) {
      throw new Error("Could not get access token");
    }
    // Create a request context
    const requestContext = new AuthorizedClientRequestContext(accessToken);
    // Parse out iModel Id and Project Id
    const iModelId = iModel.iModelId;
    const projectId = iModel.contextId;
    // Ensure they are properly defined
    if (iModelId === undefined || projectId === undefined) {
      throw new Error("IModel is not properly defined");
    }

    // Get the request URL for the comparison operation
    const url: string = this.getComparisonOperationUrl(iModelId, projectId, startChangesetId, endChangesetId);
    // Options for the request
    const options: RequestOptions = {
      method: "GET",
      headers: this.getHeaderOptions(accessToken)
    };
    try {
      // Execute the request
      const response = await request(requestContext, url, options);
      // Ensure we got a proper response
      if (response.status === 200 && response.body?.changedElements !== undefined) {
        // If so, cast the changedElements object of the body as a ChangedElements type
        return response.body.changedElements as ChangedElements;
      }
      // Something went wrong, log it to console
      console.error("Could not get changed elements. Status: " + response.status + ". Body: " + response.body);
    } catch (e) {
      console.error("Error obtaining changed elements: " + e);
    }

    // We did not get a proper response, return undefined
    return undefined;
  }

  /**
   * Enable or disable change tracking for an iModel
   * This will cause the iModel to be monitored for named versions
   * Whenever a named version gets created, the changed elements API will process the changesets
   * so that a comparison operation can be made against the new named versions
   * @param iModel IModel to track change for
   * @param value true for enabling, false for disabling
   * @returns true if successful, false if failed
   */
  public async enableChangeTracking(
    iModel: IModelConnection,
    value: boolean,
  ): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (accessToken === undefined) {
      throw new Error("Could not get access token");
    }
    // Create a request context
    const requestContext = new AuthorizedClientRequestContext(accessToken);
    // Parse out iModel Id and Project Id
    const iModelId = iModel.iModelId;
    const projectId = iModel.contextId;
    // Ensure they are properly defined
    if (iModelId === undefined || projectId === undefined) {
      throw new Error("IModel is not properly defined");
    }

    // Get the request URL for the comparison operation
    const url: string = this.getEnableChangeTrackingUrl();
    // Options for the request
    const options: RequestOptions = {
      method: "PUT",
      headers: this.getHeaderOptions(accessToken),
      body: {
        enable: value,
        iModelId,
        projectId,
      }
    };
    try {
      // Execute the request
      const response = await request(requestContext, url, options);
      // Ensure we get a proper response
      if (response.status === 202) {
        return true;
      }
      // Something went wrong, log it to console
      console.error("Could not enable change tracking. Status: " + response.status + ". Body: " + response.body);
    } catch (e) {
      console.error("Error change tracking: " + e);
    }

    // We did not get a proper response, return undefined
    return false;
  }
}