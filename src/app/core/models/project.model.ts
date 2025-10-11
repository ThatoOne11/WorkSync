export interface Project {
  id: number;
  name: string;
  target_hours: number;
  created_at: string;
  clockify_project_id?: string; // Corrected field name to match DB
}