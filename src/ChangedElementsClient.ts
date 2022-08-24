/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { ChangedElements } from "@itwin/core-common";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { Authorization } from "@itwin/imodels-client-management";

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
   * @param iTwinId iTwin Id of the iModel
   * @param startChangesetId Start changeset for comparison data
   * @param endChangesetId End changeset for comparison data
   * @returns Url for querying changed elements from the changed elements API
   */
  public getComparisonOperationUrl(
    iModelId: string,
    iTwinId: string,
    startChangesetId: string,
    endChangesetId: string
  ) {
    return this.getUrl() +
      "/comparison?iModelId=" + iModelId +
      "&iTwinId=" + iTwinId +
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
   * Get authorization for getting named versions
   * @returns 
   */
  public static async getAuthorization(): Promise<Authorization> {
    if (!IModelApp.authorizationClient)
      throw new Error("AuthorizationClient is not defined. Most likely IModelApp.startup was not called yet.");

    const token = await IModelApp.authorizationClient.getAccessToken();
    const parts = token.split(" ");
    return parts.length === 2
      ? { scheme: parts[0], token: parts[1] }
      : { scheme: "Bearer", token };
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
    // Parse out iModel Id and iTwin Id
    const iModelId = iModel.iModelId;
    const iTwinId = iModel.iTwinId;
    // Ensure they are properly defined
    if (iModelId === undefined || iTwinId === undefined) {
      throw new Error("IModel is not properly defined");
    }

    // Get the request URL for the comparison operation
    const url: string = this.getComparisonOperationUrl(iModelId, iTwinId, startChangesetId, endChangesetId);
    // Options for the request
    const authorization = await ChangedElementsClient.getAuthorization()
    const options = {
      method: "GET",
      headers: {
        Authorization: `${authorization.scheme} ${authorization.token}`,
        Accept: "application/vnd.bentley.itwin-platform.v1+json",
      },
    };
    try {
      // Execute the request
      const response = await fetch(url, options);
      // Ensure we got a proper response
      const body = await response.json();
      if (response.status === 200 && body?.changedElements !== undefined) {
        // If so, cast the changedElements object of the body as a ChangedElements type
        return body.changedElements as ChangedElements;
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
    // Parse out iModel Id and iTwin Id
    const iModelId = iModel.iModelId;
    const iTwinId = iModel.iTwinId;
    // Ensure they are properly defined
    if (iModelId === undefined || iTwinId === undefined) {
      throw new Error("IModel is not properly defined");
    }

    // Get the request URL for the comparison operation
    const url: string = this.getEnableChangeTrackingUrl();

    const authorization = await ChangedElementsClient.getAuthorization()
    // Options for the request
    const options = {
      method: "PUT",
      headers: {
        Authorization: `${authorization.scheme} ${authorization.token}`,
        Accept: "application/vnd.bentley.itwin-platform.v1+json",
      },
      body: JSON.stringify({
        enable: value,
        iModelId,
        iTwinId,
      })
    };
    try {
      // Execute the request
      const response = await fetch(url, options);
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