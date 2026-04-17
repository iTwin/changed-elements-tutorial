import { ChangedElements } from "@itwin/core-common";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import {
  Authorization,
  IModelsClient,
  NamedVersion,
  NamedVersionState,
  toArray,
} from "@itwin/imodels-client-management";

interface DiffJobSummary {
  jobId: string;
  iTwinId: string;
  iModelId: string;
  startChangesetIndex: number;
  endChangesetIndex: number;
}

interface DiffJob extends DiffJobSummary {
  status: "Queued" | "Started" | "Completed" | "Failed";
  diffingPlan: {
    strategy: string;
  };
  href?: string;
  error?: string;
  completedAgents?: number;
  totalAgents?: number;
}

interface DiffJobResponse {
  job: DiffJob;
}

interface DiffJobListResponse {
  jobs: DiffJobSummary[];
}

export class ChangedElementsClient {
  private static readonly _baseUrl = "https://api.bentley.com/changedelements/diff";
  private static readonly _changesetIndexCache = new Map<string, Map<string, number>>();

  public static async getAuthorization(): Promise<Authorization> {
    if (!IModelApp.authorizationClient)
      throw new Error("AuthorizationClient is not defined. Most likely IModelApp.startup was not called yet.");

    const token = await IModelApp.authorizationClient.getAccessToken();
    const parts = token.split(" ");

    return parts.length === 2
      ? { scheme: parts[0], token: parts[1] }
      : { scheme: "Bearer", token };
  }

  public static async fetchVisibleNamedVersions(iModelId: string): Promise<NamedVersion[]> {
    const client = new IModelsClient();
    const versionIterator = client.namedVersions.getRepresentationList({
      urlParams: { $top: 10 },
      iModelId,
      authorization: () => ChangedElementsClient.getAuthorization(),
    });

    return (await toArray(versionIterator)).filter(
      (version) => version.state === NamedVersionState.Visible
    );
  }

  private static async getChangesetIndex(iModelId: string, changesetId: string): Promise<number> {
    let indexById = this._changesetIndexCache.get(iModelId);

    if (!indexById) {
      const client = new IModelsClient();
      const changesetIterator = client.changesets.getRepresentationList({
        iModelId,
        authorization: () => ChangedElementsClient.getAuthorization(),
      });

      const changesets = await toArray(changesetIterator);
      indexById = new Map(
        changesets
          .filter((changeset) => changeset.id !== undefined && changeset.index !== undefined)
          .map((changeset) => [changeset.id as string, changeset.index as number])
      );

      this._changesetIndexCache.set(iModelId, indexById);
    }

    const changesetIndex = indexById.get(changesetId);
    if (changesetIndex === undefined)
      throw new Error("Could not resolve changeset index for the selected version.");

    return changesetIndex;
  }

  private static async getDiffRange(iModel: IModelConnection, startChangesetId: string | null) {
    const iModelId = iModel.iModelId;
    const iTwinId = iModel.iTwinId;
    const endChangesetId = iModel.changeset.id;

    if (!iModelId || !iTwinId || !endChangesetId)
      throw new Error("IModel is not properly defined.");

    if (!startChangesetId)
      throw new Error("Start changeset ID is not properly defined.");

    const [startChangesetIndex, endChangesetIndex] = await Promise.all([
      this.getChangesetIndex(iModelId, startChangesetId),
      this.getChangesetIndex(iModelId, endChangesetId),
    ]);

    if (endChangesetIndex <= startChangesetIndex)
      throw new Error("Select a named version that is older than the current iModel version.");

    return {
      iModelId,
      iTwinId,
      startChangesetIndex,
      endChangesetIndex,
    };
  }

  private static async readError(response: Response): Promise<string> {
    const body = await response.json().catch(() => undefined);
    return body?.error?.message?.toString() ?? response.statusText;
  }

  public static async listDiffJobs(iModel: IModelConnection): Promise<DiffJobSummary[]> {
    const iModelId = iModel.iModelId;
    const iTwinId = iModel.iTwinId;

    if (!iModelId || !iTwinId)
      throw new Error("IModel is not properly defined.");

    const authorization = await this.getAuthorization();
    const response = await fetch(
      this._baseUrl + "?iTwinId=" + iTwinId + "&iModelId=" + iModelId,
      {
        method: "GET",
        headers: {
          Authorization: authorization.scheme + " " + authorization.token,
          Accept: "application/vnd.bentley.itwin-platform.v3+json",
        },
      }
    );

    if (!response.ok)
      throw new Error(await this.readError(response));

    const data = (await response.json()) as DiffJobListResponse;
    return data.jobs ?? [];
  }

  private static async findDiffJob(
    iModel: IModelConnection,
    startChangesetId: string | null
  ): Promise<DiffJobSummary | null> {
    const range = await this.getDiffRange(iModel, startChangesetId);
    const jobs = await this.listDiffJobs(iModel);

    return (
      jobs.find(
        (job) =>
          job.startChangesetIndex === range.startChangesetIndex &&
          job.endChangesetIndex === range.endChangesetIndex
      ) ?? null
    );
  }

  public static async createDiffJob(iModel: IModelConnection, startChangesetId: string | null) {
    const { iTwinId, iModelId, startChangesetIndex, endChangesetIndex } = await this.getDiffRange(
      iModel,
      startChangesetId
    );

    const authorization = await this.getAuthorization();
    const response = await fetch(this._baseUrl, {
      method: "POST",
      headers: {
        Authorization: authorization.scheme + " " + authorization.token,
        "Content-Type": "application/json",
        Accept: "application/vnd.bentley.itwin-platform.v3+json",
      },
      body: JSON.stringify({
        iTwinId,
        iModelId,
        startChangesetIndex,
        endChangesetIndex,
        diffingPlan: {
          strategy: "VersionCompare",
        },
      }),
    });

    if (response.status === 409) {
      const existingJob = await this.getDiffJob(iModel, startChangesetId);
      if (existingJob)
        return existingJob;
    }

    if (!response.ok)
      throw new Error(await this.readError(response));

    const data = (await response.json()) as DiffJobResponse;
    return data.job;
  }

  public static async getDiffJob(
    iModel: IModelConnection,
    startChangesetId: string | null
  ): Promise<DiffJob | null> {
    const matchingJob = await this.findDiffJob(iModel, startChangesetId);
    if (!matchingJob)
      return null;

    const authorization = await this.getAuthorization();
    const response = await fetch(
      this._baseUrl +
        "/" +
        matchingJob.jobId +
        "?iTwinId=" +
        matchingJob.iTwinId +
        "&iModelId=" +
        matchingJob.iModelId,
      {
        method: "GET",
        headers: {
          Authorization: authorization.scheme + " " + authorization.token,
          Accept: "application/vnd.bentley.itwin-platform.v3+json",
        },
      }
    );

    if (response.status === 404)
      return null;

    if (!response.ok)
      throw new Error(await this.readError(response));

    const data = (await response.json()) as DiffJobResponse;
    return data.job;
  }

  public static async deleteDiffJob(iModel: IModelConnection, startChangesetId: string | null): Promise<boolean> {
    const matchingJob = await this.findDiffJob(iModel, startChangesetId);
    if (!matchingJob)
      return false;

    const authorization = await this.getAuthorization();
    const response = await fetch(
      this._baseUrl +
        "/" +
        matchingJob.jobId +
        "?iTwinId=" +
        matchingJob.iTwinId +
        "&iModelId=" +
        matchingJob.iModelId,
      {
        method: "DELETE",
        headers: {
          Authorization: authorization.scheme + " " + authorization.token,
          Accept: "application/vnd.bentley.itwin-platform.v3+json",
        },
      }
    );

    if (!response.ok)
      throw new Error(await this.readError(response));

    return true;
  }

  public static async getChangedElementsFromHref(href: string): Promise<ChangedElements | undefined> {
    const response = await fetch(href, {
      method: "GET",
    });

    if (!response.ok)
      throw new Error(response.statusText);

    const data = await response.json();
    return data?.changedElements as ChangedElements;
  }

  public static async fetchProgress(iModel: IModelConnection, startChangesetId: string | null): Promise<string> {
    const diffJob = await ChangedElementsClient.getDiffJob(iModel, startChangesetId);

    if (diffJob === null)
      return "Job not found";

    if (diffJob.status === "Failed")
      return "Failed";

    if (diffJob.status === "Completed")
      return "100%";

    return typeof diffJob.completedAgents === "number" &&
      typeof diffJob.totalAgents === "number" &&
      diffJob.totalAgents > 0
      ? ((diffJob.completedAgents / diffJob.totalAgents) * 100).toFixed(0) + "%"
      : diffJob.status;
  }
}
