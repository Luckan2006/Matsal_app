const { createClient } = require('@supabase/supabase-js');

// Ersätt med din Supabase URL och API-nyckel
const supabase = createClient('https://your-project-url.supabase.co', 'your-public-api-key');

async function keepAlive() {
  try {
    const { data, error } = await supabase
      .from('daily_clicks')
      .select('day')
      .eq('day', '2026-01-26')  // Vi kollar en specifik dag
      .single();

    if (error) {
      console.error('Error pinging Supabase:', error.message);
    } else {
      console.log('Ping successful:', data);
    }
  } catch (error) {
    console.error('Error in pinging:', error);
  }
}

keepAlive();
