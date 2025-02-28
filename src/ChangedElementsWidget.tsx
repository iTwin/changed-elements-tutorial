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
import { Button, LabeledSelect, toaster, Text } from "@itwin/itwinui-react";
import "./ChangedElementsWidget.scss";


export interface ChangedElementsWidgetProps {
    iModel: IModelConnection | undefined;
}

export function ChangedElementsWidget(props: ChangedElementsWidgetProps) { //@todo - naron: seemed like I can use useActiveIModelConnection() from @itwin/appui-react
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
    const [startComparisonJob, setStartComparisonJob] = useState<boolean>(false); 
    const [progress, setProgress] = useState<string>("0%");
    
    // fetch progress every 5 seconds
    useEffect(() => {
        let interval: NodeJS.Timeout;
    
        const fetchProgress = async () => {
            if (!props.iModel || !namedVersions[selectedVersionIndex]) return;
            try {
                const comparisonData = await ChangedElementClient.getComparisonJob(props.iModel, namedVersions[selectedVersionIndex].changesetId, currentChangesetID);
                if (comparisonData === null){
                    setProgress("Job not found");
                    return; 
                }
                const progressPercentage = comparisonData?.comparisonJob?.currentProgress && comparisonData?.comparisonJob?.maxProgress
                    ? ((comparisonData.comparisonJob.currentProgress / comparisonData.comparisonJob.maxProgress) * 100).toFixed(2) + "%"
                    : "0%";
    
                setProgress(progressPercentage);
            } catch (error : any) {                
                toaster.negative(
                    <>
                      <Text>Failed to fetch comparison progress</Text>
                        <Text variant="small">  {error instanceof Error ? error.message : String(error)}</Text>
                    </>);

            }
        };
        
        fetchProgress();
        interval = setInterval(fetchProgress, 5000); // Fetch every 5 seconds
    
        return () => clearInterval(interval);
    }, [props.iModel, selectedVersionIndex, startComparisonJob]);

    return (
        <div  className="widget-container">
            <h3>Changed Element Widget</h3> {/* @todo - naron: use bentley's text element? */ }
            <LabeledSelect
                label="Select Version"
                displayStyle="inline"
                options={namedVersionsOptions}
                value={selectedVersionIndex}
                onChange={(value)=> {setSelectedVersionIndex(value)}}
            ></LabeledSelect>
            
            <div>
            <Button 
                className="widget-button"
                // @todo - naron: create comparison/delete doesnt need to be async? still need result to check whether the response go through?
                onClick={async () => {
                    if (!props.iModel) return; 
                    try {
                        await ChangedElementClient.createComparisonJob(props.iModel, namedVersions[selectedVersionIndex].changesetId, currentChangesetID);
                        toaster.positive(
                            <>
                                <Text>Comparison job created successfully.</Text>
                            </>
                        );
                        startComparisonJob ? setStartComparisonJob(false) : setStartComparisonJob(true);
                    } catch (error) {
                        toaster.negative(
                            <>
                                <Text>Failed to create comparison</Text>
                                <Text variant="small">  {error instanceof Error ? error.message : String(error)}</Text>
                            </>
                        );
                    }
                }}
            >
            Create Comparison
            <Text className="widget-progress-text">Comparison Progress: {progress}</Text>
            </Button>
            </div>

            <Button
                className="widget-button"
                onClick={async () => {
                    if (!props.iModel) return; 
                    try {
                        const comparisonData = await ChangedElementClient.getComparisonJob(
                            props.iModel, 
                            namedVersions[selectedVersionIndex].changesetId, 
                            currentChangesetID
                        );
                        if (!comparisonData) { // this means an error 404 which is expected
                            toaster.negative(<Text>Comparison job not found</Text>);
                            return;
                        }
                        const href = comparisonData?.comparisonJob?.comparison?.href;
                        if (href) {
                            const changedElements = await ChangedElementClient.getChangedElementsFromHref(href);
                            if (changedElements) {
                                VisualizeChange.visualizeComparison(changedElements);
                            }
                        }
                    } catch (error) {
                        toaster.negative(
                            <>
                                <Text>Failed to visualize comparison</Text>
                                <Text variant="small">  {error instanceof Error ? error.message : String(error)}</Text>
                            </>
                        );
                    }
                }}
            >
                Visualize Comparison
            </Button>

            <Button 
                className="widget-button"
                onClick={async () => {
                    if (!props.iModel) return;
                    try {
                        const success = await ChangedElementClient.deleteComparisonJob(
                            props.iModel, 
                            namedVersions[selectedVersionIndex].changesetId, 
                            currentChangesetID
                        );
                        if (success) {
                            toaster.positive(<Text>Comparison job deleted successfully.</Text>);
                        } else {
                            toaster.negative(<Text>Failed to delete comparison job.</Text>);
                        }
                        startComparisonJob ? setStartComparisonJob(false) : setStartComparisonJob(true);
                    } catch (error) {
                        toaster.negative(
                            <>
                                <Text>Error deleting comparison job</Text>
                                <Text variant="small">  {error instanceof Error ? error.message : String(error)}</Text>
                            </>
                        );
                    }
                }}
            >
                Delete Comparison
            </Button>
        </div>
    );
}
