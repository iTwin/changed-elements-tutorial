/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { AbstractWidgetProps, StagePanelLocation, StagePanelSection, UiItemsProvider } from "@itwin/appui-abstract";
import { UiFramework } from "@itwin/appui-react";
import * as React from "react";
import { ChangedElementsWidget } from "./ChangedElementsWidget";

export class ChangedElementsUiProvider implements UiItemsProvider {
  public readonly id = 'ChangedElementsProviderId';
  
  public provideWidgets(
    stageId: string,
    stageUsage: string,
    location: StagePanelLocation,
    section?: StagePanelSection
  ): ReadonlyArray<AbstractWidgetProps> {

    const widgets: AbstractWidgetProps[] = [];
    if (
      location === StagePanelLocation.Right &&
      section === StagePanelSection.Start
    ) {
      const changedElementsWidget: AbstractWidgetProps = {
        id: 'ChangedElementsWidget',
        label: 'Changed Elements',
        getWidgetContent() {
          return (
            <ChangedElementsWidget iModel={UiFramework.getIModelConnection()} />
          );
        },
      };

      widgets.push(changedElementsWidget);
    }

    return widgets;
  }
}