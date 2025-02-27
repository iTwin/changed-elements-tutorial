import { EmphasizeElements, FeatureOverrideProvider, FeatureSymbology, IModelApp, Viewport } from "@itwin/core-frontend";
import { ChangedElements, ColorDef, FeatureAppearance, RgbColor } from "@itwin/core-common";
import { Id64Array, DbOpcode } from "@itwin/core-bentley";
import { Text, toaster } from "@itwin/itwinui-react";

/** This provider will change the color of the elements based on the last operation of the comparison. */
class ComparisonProvider implements FeatureOverrideProvider {
    private _insertOp: Id64Array = [];
    private _updateOp: Id64Array = [];
    private static _provider: ComparisonProvider | undefined;
  
    /** Creates and applies a FeatureOverrideProvider to highlight the inserted and updated element Ids */
    public static setComparison(viewport: Viewport, insertOp: Id64Array, updateOp: Id64Array): ComparisonProvider {
      ComparisonProvider.dropComparison(viewport);
      ComparisonProvider._provider = new ComparisonProvider(insertOp, updateOp);
      viewport.addFeatureOverrideProvider(ComparisonProvider._provider);
      return ComparisonProvider._provider;
    }
  
    /** Removes the previous provider. */
    public static dropComparison(viewport: Viewport) {
      if (ComparisonProvider._provider !== undefined)
        viewport.dropFeatureOverrideProvider(ComparisonProvider._provider);
      ComparisonProvider._provider = undefined;
    }
  
    private constructor(insertOp: Id64Array, updateOp: Id64Array) {
      this._insertOp = insertOp;
      this._updateOp = updateOp;
    }
  
    /** Tells the viewport how to override the elements appearance. */
    public addFeatureOverrides(overrides: FeatureSymbology.Overrides, viewport: Viewport) {
      const defaultAppearance = FeatureAppearance.fromJSON({
        rgb: {r: 200, g: 200, b: 200},
        transparency: 0.9,
        // Make unchanged elements non-locatable
        // This is to allow selecting changed elements that are behind unchanged elements in the view
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
    public static async visualizeComparison(changedElements: ChangedElements){
        const vp = IModelApp.viewManager.selectedView;
        if (vp === undefined)
            return;

        const elementIds = changedElements?.elements;
        const opcodes = changedElements?.opcodes;
        const deleteOp: Id64Array = [];
        const insertOp: Id64Array = [];
        const updateOp: Id64Array = [];
        let msgBrief = "";
        let msgDetail = "";
    
        if (
          // Tests if response has valid changes
          elementIds === undefined || elementIds.length <= 0 ||
          opcodes === undefined || opcodes.length <= 0 ||
          elementIds.length !== opcodes.length
        ) {
          msgBrief = "No elements changed";
          msgDetail = "There were 0 elements changed between change sets.";
        } else {
          msgBrief = `${elementIds.length} elements changed`;
          msgDetail = `There were ${elementIds.length} elements changed between change sets.`;
          for (let i = 0; i < elementIds.length; i += 1) {
            switch (opcodes[i]) {
              case DbOpcode.Delete:
                // Deleted elements will not be represented in this sample.
                deleteOp.push(elementIds[i]);
                break;
              case DbOpcode.Insert:
                insertOp.push(elementIds[i]);
                break;
              case DbOpcode.Update:
                updateOp.push(elementIds[i]);
                break;
            }
          }
        }
    
        toaster.informational(
          <>
            <Text>{msgBrief}</Text>
            <Text variant="small">{msgDetail}</Text>
          </>);
        
        ComparisonProvider.setComparison(vp, insertOp, updateOp);
        return { elementIds, opcodes };
    }
}