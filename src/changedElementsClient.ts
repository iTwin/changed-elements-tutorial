import { IModelApp, IModelConnection } from "@itwin/core-frontend"
import { Authorization, IModelsClient, NamedVersion, NamedVersionState, toArray } from "@itwin/imodels-client-management";
import { ChangedElements } from "@itwin/core-common";


export class ChangedElementClient {

    public static async getAuthorization(): Promise<Authorization> {
        if (!IModelApp.authorizationClient)
          throw new Error("AuthorizationClient is not defined. Most likely IModelApp.startup was not called yet.");
      
        const token = await IModelApp.authorizationClient.getAccessToken();
        const parts = token.split(" ");
        return parts.length === 2
          ? { scheme: parts[0], token: parts[1] }
          : { scheme: "Bearer", token };
    }

    static async fetchProgress(iModel: IModelConnection, startChangesetId: string | null, endChangesetId: string | undefined): Promise<string> {
      try {
          const comparisonData = await ChangedElementClient.getComparisonJob(iModel, startChangesetId, endChangesetId);
          if (comparisonData === null) {
              return "Job not found";
          }
          return comparisonData?.comparisonJob?.currentProgress && comparisonData?.comparisonJob?.maxProgress
              ? ((comparisonData.comparisonJob.currentProgress / comparisonData.comparisonJob.maxProgress) * 100).toFixed(2) + "%"
              : "0%";
      } catch (error: any) {
          throw new Error(error instanceof Error ? error.message : String(error));
      }
    }

    static async fetchVisibleNamedVersions(iModelId: string): Promise<NamedVersion[]> {
      const client = new IModelsClient();
      const iModelIterator = client.namedVersions.getRepresentationList({
        urlParams: { $top: 10 },
        iModelId,
        authorization: () => ChangedElementClient.getAuthorization(),
      });
    
      const versions = (await toArray(iModelIterator)).filter(
        (v) => v.state === NamedVersionState.Visible
      );
      return versions;
    }

    public static async createComparisonJob(iModel:IModelConnection ,startChangesetId: string | null, endChangesetId: string | undefined) {
        const iModelId = iModel.iModelId;
        const iTwinId = iModel.iTwinId;
        
        if (iModelId === undefined || iTwinId === undefined) {
            throw new Error("IModel is not properly defined");
        }
        if (startChangesetId === null || endChangesetId === undefined) {
            throw new Error("Changeset IDs are not properly defined");
        }

        const authorization = await this.getAuthorization();

        const url = "https://api.bentley.com/changedelements/comparisonjob";
        const body = {
            iTwinId,
            iModelId,
            startChangesetId,
            endChangesetId
        };

        const options = {
            method: "POST",
            headers: {
            Authorization: `${authorization.scheme} ${authorization.token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.bentley.itwin-platform.v2+json"
            },
            body: JSON.stringify(body)
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
              const errBody = await response.json()
              throw new Error(`${errBody?.error?.message}`);
            }
            const data = await response.json();
            return data?.comparisonJob;
        } catch (error) {
            throw error;
        }
    }

    public static async getComparisonJob(iModel:IModelConnection, startChangesetId: string | null, endChangesetId: string | undefined){
        const iModelId = iModel.iModelId;
        const iTwinId = iModel.iTwinId;
        
        if (iModelId === undefined || iTwinId === undefined) {
            throw new Error("IModel is not properly defined");
        }

        if (startChangesetId === null || endChangesetId === undefined) {
          throw new Error("Changeset IDs are not properly defined");
        }

        const authorization = await this.getAuthorization();
        const jobId = `${startChangesetId}-${endChangesetId}`;

        const url = `https://api.bentley.com/changedelements/comparisonjob/${jobId}/itwin/${iTwinId}/imodel/${iModelId}`;

        const options = {
            method: "GET",
            headers: {
                Authorization: `${authorization.scheme} ${authorization.token}`,
                Accept: "application/vnd.bentley.itwin-platform.v2+json",
            },
        };

        try {
            const response = await fetch(url, options);
            if (response.status === 404) {
                return null;  // job not found is expected since it gets triggered in interval
            }
            if (!response.ok) {
              const errBody = await response.json()
              throw new Error(`${errBody?.error?.message}`);
            }
            const data = await response.json();

            return data;
        } catch (error) {
            throw error;
        }
    }

    public static async getChangedElementsFromHref(href: string): Promise<ChangedElements | undefined> {
        const options = {
          method: "GET",
        };
    
        try {
          const response = await fetch(href, options);
          if (!response.ok) {
            throw new Error(response.statusText);
          }
          const data = await response.json();
          return data?.changedElements as ChangedElements;
        } catch (error) {
          throw error;
        }
    }

    public static async deleteComparisonJob(iModel:IModelConnection, startChangesetId: string | null, endChangesetId: string | undefined): Promise<boolean> {
        const iModelId = iModel.iModelId;
        const iTwinId = iModel.iTwinId;
        
        if (iModelId === undefined || iTwinId === undefined) {
            throw new Error("IModel is not properly defined");
        }

        const jobId = `${startChangesetId}-${endChangesetId}`;

        const authorization = await this.getAuthorization();
        const url = `https://api.bentley.com/changedelements/comparisonjob/${jobId}/itwin/${iTwinId}/imodel/${iModelId}`;
        const options = {
          method: "DELETE",
          headers: {
            Authorization: `${authorization.scheme} ${authorization.token}`,
            Accept: "application/vnd.bentley.itwin-platform.v2+json",
          },
        };
    
        try {
          const response = await fetch(url, options);
          if (!response.ok) {
            const errBody = await response.json()
            throw new Error(`${errBody?.error?.message}`);
          }
          // If successful, it returns 204 No Content
          return true;
        } catch (error) {
          throw error;
        }
    }

  
  }