/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Version } from "@bentley/imodelhub-client";
import { ChangedElements } from "@bentley/imodeljs-common";
import { AuthorizedFrontendRequestContext, EmphasizeElements, IModelApp, IModelConnection } from "@bentley/imodeljs-frontend";
import { Button } from "@bentley/ui-core";
import React, { useEffect, useState } from "react";
import { useCallback } from "react";
import Select from "react-select";
import { ChangedElementsFeatureOverrides } from "./ChangedElemensFeatureOverrides";
import { ChangedElementsClient } from "./ChangedElementsClient";
import "./ChangedElementsWidget.scss";

/**
 * React hook to query named versions
 * @param props 
 * @returns 
 */
function useNamedVersions(props: { iModel: IModelConnection | undefined }) {
  const [versions, setVersions] = useState<Version[]>();

  // Load named versions that can be used for comparison
  useEffect(() => {
    const loadChangesets = async () => {
      // Ensure we have a proper iModel with an iModel Id
      if (props.iModel?.iModelId === undefined) {
        console.error("iModel is not valid");
        return;
      }
      // Create request context for querying named versions
      const requestContext = await AuthorizedFrontendRequestContext.create();
      // Get the versions and set them to our state
      setVersions(await IModelApp.iModelClient.versions.get(requestContext, props.iModel.iModelId));
    };
    // Call the asynchronous function to load named versions
    loadChangesets();
  }, []);

  return versions;
}

export interface ChangedElementsWidgetProps {
  iModel: IModelConnection | undefined;
}

export function ChangedElementsWidget(props: ChangedElementsWidgetProps) {
  // Named versions of the iModel
  const versions = useNamedVersions(props);
  // Named version selected in dropdown
  const [selectedVersion, setSelectedVersion] = useState<Version | undefined>();
  // Changed elements that will be loaded and displayed in a list
  const [changedElements, setChangedElements] = useState<ChangedElements | undefined>(undefined);

  // Callback for when clicking the 'Visualize Changed Elements' button
  const onVisualizeChangedElements = useCallback(async () => {
    const iModel = props.iModel;
    if (iModel === undefined || iModel.changeSetId === undefined) {
      console.error("iModel is not valid");
      return;
    }
    if (selectedVersion?.changeSetId === undefined) {
      console.error("Selected version is not defined");
      return;
    }
    const client = new ChangedElementsClient();
    const endChangesetId = iModel.changeSetId;
    const startChangesetId = selectedVersion?.changeSetId;
    const changedElements = await client.getComparison(
      iModel,
      startChangesetId,
      endChangesetId
    );
    // Log the results to console to inspect them
    console.log(changedElements);
    const viewport = IModelApp.viewManager.selectedView;
    if (changedElements && viewport) {
      // Ensure we are not currently visualizing changed elements
      const oldProvider = viewport.findFeatureOverrideProviderOfType(ChangedElementsFeatureOverrides);
      if (oldProvider) {
        // If we are, drop the override provider so that we start with a clean viewport
        viewport.dropFeatureOverrideProvider(oldProvider);
      }
      // Create our feature override provider object
      const overrideProvider = new ChangedElementsFeatureOverrides(changedElements);
      // Add it to the viewport
      viewport.addFeatureOverrideProvider(overrideProvider);
        setChangedElements(changedElements);
    }
  }, [selectedVersion]);

  // Callback for when clicking the 'Enable Change Tracking' button
  const onEnableTracking = useCallback(async () => {
     const iModel = props.iModel;
    // Ensure our iModel is defined
    if (iModel) {
      // Create a changed elements client object
      const client = new ChangedElementsClient();
      // Enable change tracking for the iModel
      await client.enableChangeTracking(iModel, true);
    }
  }, []);

  const selectOptions = [];
  if (versions) {
    for (const version of versions) {
      selectOptions.push({
        value: version,
        label: version.name ?? "Unknown Named Version"
      });
    }
  }

  // On react select change set the new selected version
  const onReactSelectChange = (option: { value: Version | undefined, label: string } | null) => {
    setSelectedVersion(option?.value);
  };

  return (
    <div className="widget-container">
      <div className="widget-label">Select Named Version:</div>
      <Select
        value={{ value: selectedVersion, label: selectedVersion?.name ?? "" }}
        options={selectOptions}
        onChange={onReactSelectChange} />
      <Button className={"widget-button"} onClick={onVisualizeChangedElements}>
        Visualize Changed Elements
      </Button>
      <Button className={"widget-button"} onClick={onEnableTracking}>
        Enable Change Tracking
      </Button>
    </div>
  );
}