export default function handler(req, res) {
    // Allow requests from the browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Prize weights (hidden from the browser)
    // Index matches SEGMENTS order: ৳5, ৳50, ৳100, ৳1000, ৳2000, দোয়া, ∞(nova)
    const NORMAL_WEIGHTS = [30, 30, 20, 0, 0, 20, 0]; // ∞ is nova-only, 0% for normal users
    const NOVA_SEGMENT   = 6;                           // Nova always wins ∞ (index 6)

    const name = (req.query.name || '').trim().toLowerCase();

    let segmentIndex;

    if (name === 'nova') {
        segmentIndex = NOVA_SEGMENT;
    } else {
        // Weighted random pick
        const cumulative = [];
        let sum = 0;
        for (let i = 0; i < NORMAL_WEIGHTS.length; i++) {
            sum += NORMAL_WEIGHTS[i];
            cumulative.push(sum);
        }
        const roll = Math.random() * sum;
        segmentIndex = 0;
        for (let i = 0; i < cumulative.length; i++) {
            if (roll < cumulative[i]) {
                segmentIndex = i;
                break;
            }
        }
    }

    res.status(200).json({ segmentIndex });
}
