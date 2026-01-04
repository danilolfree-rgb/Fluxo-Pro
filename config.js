// key and urkl for supabase
const SUPABASE_URL = 'https://zxftraxyutwmjoreonsa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4ZnRyYXh5dXR3bWpvcmVvbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNDgzMzMsImV4cCI6MjA4MjcyNDMzM30.noOBeBltO9Bsze5Q9SWTOhHAf7tfT4hB4ozwxvXc0Fo';
const s_client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

 export { s_client }