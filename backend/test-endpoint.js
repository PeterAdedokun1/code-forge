async function test() {
    console.log('Sending Conversation...');
    const res = await fetch('http://localhost:5000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: 'test_patient_1',
            transcript: 'I have a severe headache and my feet are swelling.',
            detected_symptoms: ['headache', 'swelling']
        })
    });
    const data = await res.json();
    console.log('Conversation Payload:', data);

    console.log('\nFetching Active Alerts...');
    const alertRes = await fetch('http://localhost:5000/api/alerts');
    const alertData = await alertRes.json();
    console.log('Alerts:', JSON.stringify(alertData, null, 2));

    console.log('\nFetching Patient History...');
    const histRes = await fetch('http://localhost:5000/api/patients/test_patient_1/history');
    const histData = await histRes.json();
    console.log('History:', JSON.stringify(histData, null, 2));
}

test().catch(console.error);
