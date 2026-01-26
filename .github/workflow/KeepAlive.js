const { createClient } = require('@supabase/supabase-js');

// Ersätt med din Supabase URL och API-nyckel
const supabase = createClient('https://oxqkyajcuiqkkzbitufo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cWt5YWpjdWlxa2t6Yml0dWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjY1NTksImV4cCI6MjA3OTgwMjU1OX0.bCabibJpB50tKr0jLssB6zmFFx8cTaAbUBitIeziiIg');

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
