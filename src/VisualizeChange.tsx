import { Id64Array, DbOpcode } from "@itwin/core-bentley";
import { ChangedElements, ColorDef, FeatureAppearance } from "@itwin/core-common";
import { FeatureOverrideProvider, FeatureSymbology, IModelApp, Viewport } from "@itwin/core-frontend";
import { Text, toaster } from "@itwin/itwinui-react";

class DiffJobProvider implements FeatureOverrideProvider {
  private _insertOp: Id64Array = [];
  private _updateOp: Id64Array = [];
  private static _provider: DiffJobProvider | undefined;

  public static setDiff(viewport: Viewport, insertOp: Id64Array, updateOp: Id64Array): DiffJobProvider {
    DiffJobProvider.dropDiff(viewport);
    DiffJobProvider._provider = new DiffJobProvider(insertOp, updateOp);
    viewport.addFeatureOverrideProvider(DiffJobProvider._provider);
    return DiffJobProvider._provider;
  }

  public static dropDiff(viewport: Viewport) {
    if (DiffJobProvider._provider !== undefined)
      viewport.dropFeatureOverrideProvider(DiffJobProvider._provider);

    DiffJobProvider._provider = undefined;
  }

  private constructor(insertOp: Id64Array, updateOp: Id64Array) {
    this._insertOp = insertOp;
    this._updateOp = updateOp;
  }

  public addFeatureOverrides(overrides: FeatureSymbology.Overrides, _viewport: Viewport) {
    const defaultAppearance = FeatureAppearance.fromJSON({
      rgb: { r: 200, g: 200, b: 200 },
      transparency: 0.9,
      nonLocatable: true,
    });

    overrides.setDefaultOverrides(defaultAppearance);

    const insertFeature = FeatureAppearance.fromRgb(ColorDef.green);
    const updateFeature = FeatureAppearance.fromRgb(ColorDef.blue);

    this._insertOp.forEach((id) => overrides.override({ elementId: id, appearance: insertFeature }));
    this._updateOp.forEach((id) => overrides.override({ elementId: id, appearance: updateFeature }));
  }
}

export class VisualizeChange {
  public static async visualizeDiff(changedElements: ChangedElements) {
    const vp = IModelApp.viewManager.selectedView;
    if (vp === undefined)
      return;

    const elementIds = changedElements?.elements;
    const opcodes = changedElements?.opcodes;
    const insertOp: Id64Array = [];
    const updateOp: Id64Array = [];
    let msgBrief = "";
    let msgDetail = "";

    if (
      elementIds === undefined ||
      elementIds.length <= 0 ||
      opcodes === undefined ||
      opcodes.length <= 0 ||
      elementIds.length !== opcodes.length
    ) {
      msgBrief = "No elements changed";
      msgDetail = "There were 0 elements changed between the selected versions.";
    } else {
      msgBrief = `${elementIds.length} elements changed`;
      msgDetail = `There were ${elementIds.length} elements changed between the selected versions.`;

      for (let index = 0; index < elementIds.length; index += 1) {
        switch (opcodes[index]) {
          case DbOpcode.Insert:
            insertOp.push(elementIds[index]);
            break;
          case DbOpcode.Update:
            updateOp.push(elementIds[index]);
            break;
        }
      }
    }

    toaster.informational(
      <>
        <Text>{msgBrief}</Text>
        <Text variant="small">{msgDetail}</Text>
      </>
    );

    DiffJobProvider.setDiff(vp, insertOp, updateOp);
    return { elementIds, opcodes };
  }
}
