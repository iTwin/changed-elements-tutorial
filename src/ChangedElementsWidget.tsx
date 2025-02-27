import { IModelConnection } from "@itwin/core-frontend";
import { useState, useEffect } from "react";
import {
    Authorization,
    NamedVersion,
    IModelsClient,
    NamedVersionState,
    toArray
  } from "@itwin/imodels-client-management";
import { ChangedElementClient } from "./changedElementsClient";
import { VisualizeChange } from "./VisualizeChange";
import { Button, LabeledSelect } from "@itwin/itwinui-react";

export interface ChangedElementsWidgetProps {
    iModel: IModelConnection | undefined;
}

export function ChangedElementsWidget(props: ChangedElementsWidgetProps) { //@todo - naron: seemed like I can use useActiveIModelConnection() from @itwin/appui-react
    // if (!props.iModel) {
    //     return <div>No iModel Connection</div>;
    // }

    useEffect(() => {
        const fetchVersions = async () => {
            if (!props.iModel?.iModelId) return;
    
            const client = new IModelsClient();
            const iModelIterator = client.namedVersions.getRepresentationList({
                urlParams: { $top: 10 },
                iModelId: props.iModel.iModelId,
                authorization: () => ChangedElementClient.getAuthorization(),
            });
    
            const versionsArray = (await toArray(iModelIterator)).filter(
                (version) => version.state === NamedVersionState.Visible
            );

            setNamedVersions(versionsArray);
        };
    
        fetchVersions();
    }, [props.iModel]);

    const [namedVersions, setNamedVersions] = useState<NamedVersion[]>([]);
    const currentChangesetID = props.iModel?.changeset.id;
    const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
    const namedVersionsOptions = namedVersions.map((version, index) => ({ value: index, label: `${version.displayName}` }));

    return (
        <div>
            <h3>Changed Element Widget</h3>
            <LabeledSelect
                label="Select Version"
                displayStyle="inline"
                options={namedVersionsOptions}
                value={selectedVersionIndex}
                onChange={(value)=> {setSelectedVersionIndex(value)}}
            ></LabeledSelect>
            
            <Button 
                // @todo - naron: actually create comparison/delete doesnt need to be async? still need result to check whether the response go through?
                onClick={async () => {
                    if (!props.iModel) return; 
                    try {
                        const data = await ChangedElementClient.createComparisonJob(props.iModel, namedVersions[selectedVersionIndex].changesetId, currentChangesetID);
                        console.log ("Create Comparison Job Response:", data);
                    } catch (error) {
                        console.error("Failed to create comparison job:", error);
                    }
                }}
            >
            Create Comparison
            </Button>


            <Button
                // @todo - naron: maybe enculpsulate this in a function getAndVisualizeComparison
                onClick={async () => {
                    if (!props.iModel) return; 
                    try {
                        const comparisonData = await ChangedElementClient.getComparisonJob(props.iModel, namedVersions[selectedVersionIndex].changesetId, currentChangesetID);
                        const href = comparisonData?.comparisonJob?.comparison?.href;
                        if (href){
                            const changedElements = await ChangedElementClient.getChangedElementsFromHref(href);
                            console.log("Changed Elements:", changedElements);
                            if (changedElements) {
                                // Visualize the comparison
                                VisualizeChange.visualizeComparison(changedElements);
                            }
                        }
                    } catch (error) {
                        console.error("Failed to visualize:", error);
                    }
                }}>Visualize Comparison</Button>

            <Button 
                onClick={
                async () => {
                    if (!props.iModel) return;
                    try {
                        const success = await ChangedElementClient.deleteComparisonJob(props.iModel, namedVersions[selectedVersionIndex].changesetId, currentChangesetID);
                        if (success) {
                            console.log("Comparison job deleted successfully.");
                        } else {
                            console.error("Failed to delete comparison job.");
                        }
                    } catch (error) {
                        console.error("Error deleting comparison job:", error);
                    }
            }}>Delete Comparison</Button>
        </div>
    );
}
