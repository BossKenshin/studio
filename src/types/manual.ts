export interface ManualStep {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
}

export interface ManualData {
  manualTitle: string;
  headerImageUrl: string;
  steps: ManualStep[];
}
