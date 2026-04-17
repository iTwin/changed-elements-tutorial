import { IModelConnection } from "@itwin/core-frontend";
import { NamedVersion } from "@itwin/imodels-client-management";
import { Button, LabeledSelect, Text, toaster } from "@itwin/itwinui-react";
import { useEffect, useState } from "react";

import { ChangedElementsClient } from "./ChangedElementsClient";
import { VisualizeChange } from "./VisualizeChange";
import "./ChangedElementsWidget.scss";

export interface ChangedElementsWidgetProps {
  iModel: IModelConnection | undefined;
}

export function ChangedElementsWidget(props: ChangedElementsWidgetProps) {
  const [namedVersions, setNamedVersions] = useState<NamedVersion[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [diffJobActive, setDiffJobActive] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>("0%");

  const selectedVersion = namedVersions[selectedVersionIndex];
  const namedVersionOptions = namedVersions.map((version, index) => ({
    value: index,
    label: version.displayName?.toString() ?? version.name?.toString() ?? `Version ${index + 1}`,
  }));

  useEffect(() => {
    const fetchVersions = async () => {
      if (!props.iModel?.iModelId)
        return;

      const versionsArray = await ChangedElementsClient.fetchVisibleNamedVersions(props.iModel.iModelId);
      setNamedVersions(versionsArray);
      setSelectedVersionIndex(0);
    };

    void fetchVersions();
  }, [props.iModel]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const fetchProgress = async () => {
      if (!props.iModel || !selectedVersion)
        return;

      try {
        const progressPercentage = await ChangedElementsClient.fetchProgress(
          props.iModel,
          selectedVersion.changesetId
        );
        setProgress(progressPercentage);
      } catch (error) {
        toaster.negative(
          <>
            <Text>Failed to fetch diff job progress</Text>
            <Text variant="small">{(error as Error)?.message ?? "Error fetching progress"}</Text>
          </>
        );
      }
    };

    void fetchProgress();
    interval = setInterval(() => {
      void fetchProgress();
    }, 3000);

    return () => {
      if (interval)
        clearInterval(interval);
    };
  }, [props.iModel, selectedVersion, diffJobActive]);

  const handleCreateDiffJob = async () => {
    if (!props.iModel || !selectedVersion)
      return;

    try {
      await ChangedElementsClient.createDiffJob(
        props.iModel,
        selectedVersion.changesetId
      );

      setDiffJobActive((value) => !value);
      toaster.positive(<Text>Diff job created successfully.</Text>);
    } catch (error) {
      toaster.negative(
        <>
          <Text>Failed to create diff job</Text>
          <Text variant="small">{(error as Error)?.message ?? "Error creating diff job"}</Text>
        </>
      );
    }
  };

  const handleVisualizeDiff = async () => {
    if (!props.iModel || !selectedVersion)
      return;

    try {
      const diffJob = await ChangedElementsClient.getDiffJob(
        props.iModel,
        selectedVersion.changesetId
      );

      if (!diffJob) {
        toaster.negative(<Text>Diff job not found</Text>);
        return;
      }

      if (diffJob.status === "Failed") {
        toaster.negative(
          <>
            <Text>Diff job failed</Text>
            <Text variant="small">{diffJob.error ?? "The diff job failed."}</Text>
          </>
        );
        return;
      }

      if (!diffJob.href) {
        toaster.negative(<Text>Diff job not ready</Text>);
        return;
      }

      const changedElements = await ChangedElementsClient.getChangedElementsFromHref(diffJob.href);
      if (changedElements)
        await VisualizeChange.visualizeDiff(changedElements);
    } catch (error) {
      toaster.negative(
        <>
          <Text>Failed to visualize diff</Text>
          <Text variant="small">{(error as Error)?.message ?? "Error getting diff job"}</Text>
        </>
      );
    }
  };

  const handleDeleteDiffJob = async () => {
    if (!props.iModel || !selectedVersion)
      return;

    try {
      const deleted = await ChangedElementsClient.deleteDiffJob(
        props.iModel,
        selectedVersion.changesetId
      );

      if (!deleted) {
        toaster.informational(<Text>No matching diff job was found.</Text>);
        return;
      }

      setDiffJobActive((value) => !value);
      toaster.positive(<Text>Diff job deleted successfully.</Text>);
    } catch (error) {
      toaster.negative(
        <>
          <Text>Error deleting diff job</Text>
          <Text variant="small">{(error as Error)?.message ?? "Error deleting diff job"}</Text>
        </>
      );
    }
  };

  return (
    <div className="widget-container">
      <Text>Changed Elements V3 Widget</Text>
      <LabeledSelect
        label="Select Version"
        displayStyle="inline"
        options={namedVersionOptions}
        value={selectedVersionIndex}
        onChange={(value) => setSelectedVersionIndex(Number(value ?? 0))}
      />

      <Text className="widget-progress-text">
        Diff Job Progress: {selectedVersion ? progress : "No versions available"}
      </Text>

      <Button onClick={handleCreateDiffJob} disabled={!selectedVersion}>Create Diff Job</Button>
      <Button onClick={handleVisualizeDiff} disabled={!selectedVersion}>Visualize Diff</Button>
      <Button onClick={handleDeleteDiffJob} disabled={!selectedVersion}>Delete Diff Job</Button>
    </div>
  );
}
