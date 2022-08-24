/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { IModelsClient, NamedVersion, NamedVersionState, toArray } from "@itwin/imodels-client-management";
import { Button, LabeledSelect, SelectOption } from "@itwin/itwinui-react";
import React, { useEffect, useState } from "react";
import { useCallback } from "react";
import { ChangedElementsFeatureOverrides } from "./ChangedElemensFeatureOverrides";
import { ChangedElementsClient } from "./ChangedElementsClient";
import "./ChangedElementsWidget.scss";

/**
 * React hook to query named versions
 * @param props 
 * @returns 
 */
function useNamedVersions(props: { iModel: IModelConnection | undefined }) {
  const [versions, setVersions] = useState<NamedVersion[]>();

  // Load named versions that can be used for comparison
  useEffect(() => {
    const loadChangesets = async () => {
      // Ensure we have a proper iModel with an iModel Id
      if (props.iModel?.iModelId === undefined) {
        console.error("iModel is not valid");
        return;
      }
      /** Uses the IModelClient to the request the Named Version of the IModel. Only selects name and changeset id.  Limited to top 10 Named Versions. */
      const client = new IModelsClient();
      const iModelIterator = client.namedVersions.getRepresentationList({
        urlParams: { $top: 10 },
        iModelId: props.iModel.iModelId,
        authorization: ChangedElementsClient.getAuthorization,
      });

      // Get the versions and set them to our state
      const namedVersions = (await toArray(iModelIterator)).filter((version) => version.state === NamedVersionState.Visible);
      setVersions(namedVersions);
    };
    // Call the asynchronous function to load named versions
    loadChangesets();
  }, [props.iModel]);

  return versions;
}

export interface ChangedElementsWidgetProps {
  iModel: IModelConnection | undefined;
}

export function ChangedElementsWidget(props: ChangedElementsWidgetProps) {
  // Named versions of the iModel
  const versions = useNamedVersions(props);
  // Named version selected in dropdown
  const [selectedVersion, setSelectedVersion] = useState<NamedVersion | undefined>();

  // Callback for when clicking the 'Visualize Changed Elements' button
  const onVisualizeChangedElements = useCallback(async () => {
    const iModel = props.iModel;
    if (iModel === undefined || iModel.changeset.id === undefined) {
      console.error("iModel is not valid");
      return;
    }
    if (selectedVersion?.changesetId === undefined || selectedVersion.changesetId == null) {
      console.error("Selected version is not defined");
      return;
    }
    const client = new ChangedElementsClient();
    const endChangesetId = iModel.changeset.id;
    const startChangesetId = selectedVersion.changesetId;
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
    }
  }, [selectedVersion, props.iModel]);

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
  }, [props.iModel]);

  const selectOptions: SelectOption<NamedVersion | undefined>[] = [];
  if (versions) {
    for (const version of versions) {
      selectOptions.push({
        value: version,
        label: version.name ?? "Unknown Named Version"
      });
    }
  }

  // On react select change set the new selected version
  const onReactSelectChange = (option: any) => {
    setSelectedVersion(option);
  };

  return (
    <div className="widget-container">
      <div className="widget-label">Select Named Version:</div>
      <LabeledSelect
        value={selectedVersion}
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