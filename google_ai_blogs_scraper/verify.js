import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('./google_ai_blogs.json', 'utf8'));

console.log('=== Data Verification ===\n');
console.log('Total entries:', data.length);

console.log('\n--- Sample Entries ---');
console.log('First entry:', {
  title: data[0].title.substring(0, 60) + '...',
  url: data[0].url,
  date: data[0].date
});

console.log('\nMiddle entry (15):', {
  title: data[14].title.substring(0, 60) + '...',
  url: data[14].url,
  date: data[14].date
});

console.log('\nLast entry:', {
  title: data[29].title.substring(0, 60) + '...',
  url: data[29].url,
  date: data[29].date
});

console.log('\n--- Null Check ---');
const nullTitles = data.filter(d => !d.title);
const nullUrls = data.filter(d => !d.url);
const nullDates = data.filter(d => !d.date);

console.log('Entries with null title:', nullTitles.length);
console.log('Entries with null url:', nullUrls.length);
console.log('Entries with null date:', nullDates.length);

if (nullTitles.length === 0 && nullUrls.length === 0 && nullDates.length === 0) {
  console.log('\n✅ SUCCESS: All 30 entries have complete data (title, url, date)');
} else {
  console.log('\n❌ FAILURE: Found null values');
}

console.log('\n--- Date Distribution ---');
const dateCounts = {};
data.forEach(entry => {
  if (!dateCounts[entry.date]) {
    dateCounts[entry.date] = 0;
  }
  dateCounts[entry.date]++;
});

console.log('Unique dates:', Object.keys(dateCounts).length);
console.log('Date range:', Object.keys(dateCounts).sort().reverse().slice(0, 3).join(', '), '...');
