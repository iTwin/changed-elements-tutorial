import { IModelConnection } from "@itwin/core-frontend";
import { useState, useEffect } from "react";
import { NamedVersion } from "@itwin/imodels-client-management";
import { ChangedElementClient } from "./changedElementsClient";
import { VisualizeChange } from "./VisualizeChange";
import { Button, LabeledSelect, toaster, Text } from "@itwin/itwinui-react";
import "./ChangedElementsWidget.scss";


export interface ChangedElementsWidgetProps {
    iModel: IModelConnection | undefined;
}

export function ChangedElementsWidget(props: ChangedElementsWidgetProps) { 
    //@todo: seemed like useActiveIModelConnection() from @itwin/appui-react can be used here to get the iModelConnection? so no need to pass it as a prop?
    const [namedVersions, setNamedVersions] = useState<NamedVersion[]>([]);
    const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
    const [comparisonActive, setComparisonActive] = useState<boolean>(false); 
    const [progress, setProgress] = useState<string>("0%");

    const namedVersionsOptions = namedVersions.map((version, index) => ({ 
        value: index, label: `${version.displayName}` 
    }));
    
    // fetch named versions 
    useEffect(() => {
        const fetchVersions = async () => {
            if (!props.iModel?.iModelId) return;
            const versionsArray = await ChangedElementClient.fetchVisibleNamedVersions(props.iModel.iModelId);

            setNamedVersions(versionsArray);
          };
    
        fetchVersions();
    }, [props.iModel]);

    // fetch progress every 3 seconds 
    useEffect(() => {
        let interval: NodeJS.Timeout;
    
        const fetchProgress = async () => {
            if (!props.iModel || !namedVersions[selectedVersionIndex]) return;
            try {
                const progressPercentage = await ChangedElementClient.fetchProgress(
                    props.iModel,
                    namedVersions[selectedVersionIndex].changesetId
                );
                setProgress(progressPercentage);
            } catch (error: any) {
                toaster.negative(
                    <>
                    <Text>Failed to fetch comparison progress</Text>
                    <Text variant="small">{(error as Error)?.message ?? "Error fetching progress"}</Text>
                </>
                );
            }
        };
  
        
        fetchProgress();
        interval = setInterval(fetchProgress, 3000); // Fetch every 3 seconds
    
        return () => clearInterval(interval);
    }, [props.iModel, namedVersions[selectedVersionIndex], selectedVersionIndex, comparisonActive]);


    // functions for on click events
    const handleCreateComparison = async () => {
        if (!props.iModel) return; 
        try {
          await ChangedElementClient.createComparisonJob(
            props.iModel, 
            namedVersions[selectedVersionIndex].changesetId
          );
          toaster.positive(<Text>Comparison job created successfully.</Text>);
          setComparisonActive(!comparisonActive);
        } catch (error) {
          toaster.negative(
            <>
              <Text>Failed to create comparison</Text>
              <Text variant="small">{(error as Error)?.message ?? "Error creating comparison"}</Text>
            </>
          );
        }
      };
      
    const handleVisualizeComparison = async () => {
        if (!props.iModel) return; 
        try {
            const comparisonData = await ChangedElementClient.getComparisonJob(
                props.iModel, 
                namedVersions[selectedVersionIndex].changesetId
                );
            if (!comparisonData) {
                toaster.negative(<Text>Comparison job not found</Text>);
                return;
            }
            const href = comparisonData?.comparisonJob?.comparison?.href;
            if (!href) {
                toaster.negative(<Text>Comparison job not ready</Text>);
                return;
            }
            const changedElements = await ChangedElementClient.getChangedElementsFromHref(href);
            if (changedElements) {
                VisualizeChange.visualizeComparison(changedElements);
            }
            
            } catch (error) {
                toaster.negative(
                <>
                    <Text>Failed to visualize comparison</Text>
                    <Text variant="small">{(error as Error)?.message ?? "Error getting comparison"}</Text>
                </>
                );
        }
    };
    
    const handleDeleteComparison = async () => {
        if (!props.iModel) return;
        try {
            await ChangedElementClient.deleteComparisonJob(
                props.iModel, 
                namedVersions[selectedVersionIndex].changesetId
                );
 
            setComparisonActive(!comparisonActive);
            toaster.positive(<Text>Comparison job deleted successfully.</Text>)
        } catch (error) {
            toaster.negative(
            <>
                <Text>Error deleting comparison job</Text>
                <Text variant="small">{(error as Error)?.message ?? "Error deleting comparison"}</Text>
            </>
            );
        }
    };

    return (
        <div  className="widget-container">
            <Text>Changed Element Widget</Text>
            <LabeledSelect
                label="Select Version"
                displayStyle="inline"
                options={namedVersionsOptions}
                value={selectedVersionIndex}
                onChange={(value)=> {setSelectedVersionIndex(value)}}
            ></LabeledSelect>
        
            <Text className="widget-progress-text">Comparison Progress: {progress}</Text> 

            <Button onClick={handleCreateComparison}>Create Comparison</Button>
            <Button onClick={handleVisualizeComparison}>Visualize Comparison</Button>
            <Button onClick={handleDeleteComparison}>Delete Comparison</Button>
        </div>
    );
}
