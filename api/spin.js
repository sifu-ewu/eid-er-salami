export default function handler(req, res) {
    // Allow requests from the browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Prize weights (hidden from the browser)
    // Index: ৳5, ৳50, ৳100, ৳1000, ৳2000, দোয়া, ∞(nova)
    // Equal probability for all 9 segments for normal users; Nova always gets ∞
    // Index: ৳5, ৳50, ৳100, ৳200, ৳500, ৳1000, ৳2000, দোয়া, ∞
    const NORMAL_WEIGHTS = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    const NOVA_SEGMENT   = 8;                           // Nova always wins ∞ (index 8)

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
