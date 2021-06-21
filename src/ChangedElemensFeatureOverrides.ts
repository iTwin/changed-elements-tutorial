/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { DbOpcode, Id64String } from "@bentley/bentleyjs-core";
import { ChangedElements, FeatureAppearance } from "@bentley/imodeljs-common";
import { FeatureOverrideProvider, FeatureSymbology, Viewport } from "@bentley/imodeljs-frontend";

/**
 * Feature Override Provider to visualize changed elements and colorize them
 * in the viewport
 */
export class ChangedElementsFeatureOverrides implements FeatureOverrideProvider {
  // Array of inserted element Ids
  private _insertedElements: Id64String[] = [];
  // Array of updated element Ids
  private _updatedElements: Id64String[] = [];

  /**
   * Constructor
   * @param changedElements Changed Elements to visualize
   */
  public constructor(changedElements: ChangedElements) {
    // Go over all changed elements array, all arrays are guaranteed to have same size
    for (let i = 0; i < changedElements.elements.length; ++i) {
      // Element Id of the changed element
      const elementId: Id64String = changedElements.elements[i];
      // Operation code of the changed element
      const opcode: DbOpcode = changedElements.opcodes[i];
      // Add the element Id to the proper list
      switch (opcode) {
        case DbOpcode.Delete:
          // Deleted elements do not exist in the current version of the iModel
          // Displaying non-iModel elements in the same view is out of scope for this tutorial
          break;
        case DbOpcode.Update:
          this._updatedElements.push(elementId);
          break;
        case DbOpcode.Insert:
          this._insertedElements.push(elementId);
          break;
      }
    }
  }

  /**
   * Adds the colorization and emphasis of the elements we care about
   * @param overrides Overrides to be updated with our changed elements
   * @param viewport Viewport we are overriding features on
   */
  public addFeatureOverrides(overrides: FeatureSymbology.Overrides, viewport: Viewport): void {
    // Create a default appearance for non-changed elements, set it to transparent light gray
    const defaultAppearance = FeatureAppearance.fromJSON({
      rgb: {r: 200, g: 200, b: 200},
      transparency: 0.9,
      // Make unchanged elements non-locatable
      // This is to allow selecting changed elements that are behind unchanged elements in the view
      nonLocatable: true,
    });
    // Override the default coloring for all other elements
    overrides.setDefaultOverrides(defaultAppearance);

    // Create an appearance with the color green for inserted elements and emphasize them
    const insertedAppearance = FeatureAppearance.fromJSON({
      rgb: {r: 0, g: 255, b: 0},
      emphasized: true,
    });
    // Override the inserted elements with the appearance
    this._insertedElements.forEach((elementId: string) => {
      overrides.overrideElement(elementId, insertedAppearance);
    });

    // Create an appearance with the color blue for updated elements
    const updatedAppearance = FeatureAppearance.fromJSON({
      rgb: {r: 0, g: 0, b: 255},
      emphasized: true
    });
    // Override the updated elements with the appearance
    this._updatedElements.forEach((elementId: string) => {
      overrides.overrideElement(elementId, updatedAppearance);
    });
  }
}