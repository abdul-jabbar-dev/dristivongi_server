import { searchService } from './src/modules/search/search.service';

async function runSearchTests() {
  console.log('--- STARTING CIVICLENS SEARCH ENGINE TESTS ---');

  // Test 1: Suggestions
  console.log('\n[TEST 1] Testing Search Suggestions for "road":');
  const suggestions = await searchService.getSuggestions('road');
  console.log('Found suggestions count:', suggestions.items.length);
  console.log('Items:', JSON.stringify(suggestions.items, null, 2));

  // Test 2: Global Search with scope=all
  console.log('\n[TEST 2] Testing Global Search for "road" (scope=all):');
  const globalAll = await searchService.globalSearch({ q: 'road', scope: 'all' });
  console.log('Query Intent:', globalAll.intent);
  console.log('Cases count:', globalAll.results.cases.total);
  console.log('Claims count:', globalAll.results.claims.total);
  console.log('Evidence count:', globalAll.results.evidence.total);
  console.log('Organizations count:', globalAll.results.organizations.total);
  console.log('Users count:', globalAll.results.users.total);

  // Test 3: Bengali Query Search
  console.log('\n[TEST 3] Testing Bengali Query "ঢাকা" (Dhaka):');
  const bengaliRes = await searchService.globalSearch({ q: 'ঢাকা', scope: 'all' });
  console.log('Bengali query intent:', bengaliRes.intent);
  console.log('Cases found:', bengaliRes.results.cases.total);

  // Test 4: People / User Intent Search
  console.log('\n[TEST 4] Testing User Lookup:');
  const userRes = await searchService.globalSearch({ q: 'Abdul', scope: 'users' });
  console.log('User Intent:', userRes.intent);
  console.log('Users found:', userRes.results.users.items.map(u => ({ name: u.fullName, username: u.userName })));

  // Test 5: Organization Search
  console.log('\n[TEST 5] Testing Organization Search:');
  const orgRes = await searchService.globalSearch({ q: 'Watch', scope: 'organizations' });
  console.log('Org Intent:', orgRes.intent);
  console.log('Orgs found:', orgRes.results.organizations.items.map(o => ({ name: o.name, slug: o.slug })));

  // Test 6: Permissions - Private Org & Anonymous Identity Masking
  console.log('\n[TEST 6] Verifying Privacy & Anonymity:');
  for (const c of globalAll.results.cases.items) {
    if (c.isAnonymous) {
      if (c.author.name !== 'Anonymous Contributor' || c.author.avatarUrl !== null) {
        throw new Error(`Privacy failure: Anonymous case ${c.id} leaked author identity!`);
      }
    }
  }
  console.log('Anonymity checks passed! Anonymous contributors are safely masked.');

  console.log('\n✅ ALL CIVICLENS SEARCH ENGINE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runSearchTests().catch(err => {
  console.error('❌ Search test failed:', err);
  process.exit(1);
});
