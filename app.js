(() => {
    'use strict';

    // ===========================
    // Configuration
    // ===========================
    const SEGMENTS = [
        { label: '৳5',    value: 5,      color: '#FFF8E7', textColor: '#1A1A2E', type: 'money' },
        { label: '৳50',   value: 50,     color: '#FFD700', textColor: '#1A1A2E', type: 'money' },
        { label: '৳100',  value: 100,    color: '#00A86B', textColor: '#FFF8E7', type: 'money' },
        { label: '৳200',  value: 200,    color: '#4FC3F7', textColor: '#1A1A2E', type: 'money' },
        { label: '৳500',  value: 500,    color: '#FF9800', textColor: '#1A1A2E', type: 'money' },
        { label: '৳1000', value: 1000,   color: '#FF6B6B', textColor: '#1A1A2E', type: 'money' },
        { label: '৳2000', value: 2000,   color: '#E84545', textColor: '#FFF8E7', type: 'money' },
        { label: 'দোয়া ☪', value: 'dua',  color: '#7B2D8E', textColor: '#FFD700', type: 'dua'  },
        { label: '∞',       value: 'nova', color: '#C92B7A', textColor: '#FFD700', type: 'nova' },
    ];

    const NUM_SEGMENTS = SEGMENTS.length;
    const ARC = (2 * Math.PI) / NUM_SEGMENTS;
    const FULL_SPINS = 6;
    const SPIN_DURATION_MS = 5000;

    // ===========================
    // DOM References
    // ===========================
    const canvas       = document.getElementById('wheelCanvas');
    const ctx          = canvas.getContext('2d');
    const wheelWrapper = document.getElementById('wheelWrapper');
    const spinBtn      = document.getElementById('spinBtn');
    const nameInput    = document.getElementById('playerName');
    const moneyModal   = document.getElementById('moneyModal');
    const duaModal     = document.getElementById('duaModal');
    const moneyTitle   = document.getElementById('moneyTitle');
    const moneyAmount  = document.getElementById('moneyAmount');
    const moneyCloseBtn= document.getElementById('moneyCloseBtn');
    const duaCloseBtn  = document.getElementById('duaCloseBtn');
    const duaName      = document.getElementById('duaName');
    const pointer        = document.querySelector('.pointer');
    const moneyCard      = document.querySelector('.money-card');
    const novaModal      = document.getElementById('novaModal');
    const novaCloseBtn   = document.getElementById('novaCloseBtn');
    const novaAmountInput  = document.getElementById('novaAmountInput');
    const novaConfirmBtn   = document.getElementById('novaConfirmBtn');
    const novaInputSection = document.getElementById('novaInputSection');
    const novaDisplay      = document.getElementById('novaDisplay');
    const novaFinalAmount  = document.getElementById('novaFinalAmount');
    const novaTitle        = document.getElementById('novaTitle');
    const novaSubLove      = document.getElementById('novaSubLove');

    let currentRotation = 0;
    let isSpinning = false;

    // ===========================
    // Draw Wheel
    // ===========================
    function drawWheel() {
        const dpr = window.devicePixelRatio || 1;
        const container = wheelWrapper;
        const size = container.clientWidth;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(dpr, dpr);

        const cx = size / 2;
        const cy = size / 2;
        const radius = size / 2 - 2;

        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const startAngle = i * ARC - Math.PI / 2;
            const endAngle = startAngle + ARC;
            const seg = SEGMENTS[i];

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();

            // Segment border
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#1A1A2E';
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(startAngle + ARC / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = seg.textColor;
            const fontSize = seg.type === 'nova'
                ? Math.max(size * 0.13, 24)
                : Math.max(size * 0.065, 14);
            ctx.font = `bold ${fontSize}px 'Space Grotesk', sans-serif`;
            ctx.fillText(seg.label, radius - 14, seg.type === 'nova' ? 10 : 5);
            ctx.restore();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.13, 0, 2 * Math.PI);
        ctx.fillStyle = '#1A1A2E';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.09, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1A1A2E';
        ctx.stroke();
    }

    // ===========================
    // Calculate Target Rotation
    // ===========================
    function getTargetRotation(segmentIndex) {
        const segDeg = 360 / NUM_SEGMENTS;
        // Center of segment i (clockwise from top) = i * segDeg + segDeg/2
        // To land pointer on segment i: rotation mod 360 = 360 - (i * segDeg + segDeg/2)
        const segCenter = segmentIndex * segDeg + segDeg / 2;
        const jitter = (Math.random() - 0.5) * (segDeg * 0.6);
        const desiredAngle = (((360 - segCenter + jitter) % 360) + 360) % 360;

        // Calculate how much extra rotation from current position to reach desiredAngle
        const currentAngle = ((currentRotation % 360) + 360) % 360;
        let extraRotation = desiredAngle - currentAngle;
        if (extraRotation < 0) extraRotation += 360;

        // Add full spins for dramatic effect + the extra to land correctly
        const target = currentRotation + 360 * FULL_SPINS + extraRotation;
        return target;
    }

    // ===========================
    // Spin
    // ===========================
    async function spin() {
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.focus();
            nameInput.style.boxShadow = `6px 6px 0 #FF6B6B`;
            setTimeout(() => {
                nameInput.style.boxShadow = '';
            }, 1000);
            return;
        }

        if (isSpinning) return;
        isSpinning = true;
        spinBtn.disabled = true;

        // Ask the server which segment was won (keeps weights & Nova logic hidden)
        let segIndex;
        try {
            const res = await fetch(`/api/spin?name=${encodeURIComponent(name)}`);
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            segIndex = data.segmentIndex;
        } catch (err) {
            // Fallback for local testing (no server)
            if (name.toLowerCase() === 'nova') {
                segIndex = 8; // always ∞ for Nova (index 8 after adding ৳200 & ৳500)
            } else {
                const fallbackWeights = [1, 1, 1, 1, 1, 1, 1, 1, 1];
                const sum = fallbackWeights.reduce((a, b) => a + b, 0);
                const roll = Math.random() * sum;
                let cumulative = 0;
                segIndex = 0;
                for (let i = 0; i < fallbackWeights.length; i++) {
                    cumulative += fallbackWeights[i];
                    if (roll < cumulative) { segIndex = i; break; }
                }
            }
        }

        const targetRotation = getTargetRotation(segIndex);

        // Apply spin
        wheelWrapper.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
        wheelWrapper.style.transform = `rotate(${targetRotation}deg)`;

        // Shake effect during spin
        document.body.classList.add('shaking');
        setTimeout(() => {
            document.body.classList.remove('shaking');
        }, SPIN_DURATION_MS - 1000);

        currentRotation = targetRotation;

        // Wait for spin to finish
        const onEnd = () => {
            wheelWrapper.removeEventListener('transitionend', onEnd);
            isSpinning = false;
            spinBtn.disabled = false;

            // Bounce pointer
            pointer.classList.add('bounce');
            setTimeout(() => pointer.classList.remove('bounce'), 400);

            // Show result
            showResult(segIndex, name);
        };

        wheelWrapper.addEventListener('transitionend', onEnd);
    }

    // ===========================
    // Show Result
    // ===========================
    function showResult(segIndex, name) {
        const seg = SEGMENTS[segIndex];

        if (seg.type === 'dua') {
            showDuaModal(name);
        } else if (seg.type === 'nova') {
            showNovaModal(name);
        } else {
            showMoneyModal(name, seg.value);
        }
    }

    // ===========================
    // Money Modal
    // ===========================
    function showMoneyModal(name, amount) {
        moneyTitle.textContent = `${name}, তোমার ঈদ সালামি!`;
        moneyAmount.textContent = `৳${amount}`;

        // Styling based on amount
        moneyCard.classList.remove('big-win', 'small-win');
        if (amount >= 2000) {
            moneyCard.classList.add('big-win');
            document.querySelector('.money-emoji').textContent = '🎊✨🎉';
        } else if (amount <= 5) {
            moneyCard.classList.add('small-win');
            document.querySelector('.money-emoji').textContent = '😅';
        } else {
            document.querySelector('.money-emoji').textContent = '🎉';
        }

        moneyModal.classList.add('active');

        // Confetti
        if (amount >= 2000) {
            launchConfetti(50, true);
        } else if (amount >= 100) {
            launchConfetti(25, false);
        } else if (amount >= 50) {
            launchConfetti(15, false);
        } else {
            launchConfetti(4, false);
        }
    }

    function closeMoneyModal() {
        moneyModal.classList.remove('active');
        clearConfetti();
    }

    // ===========================
    // Dua Modal
    // ===========================
    function showDuaModal(name) {
        duaName.textContent = `${name}, ঈদ মুবারাক! 🌙`;
        duaModal.classList.add('active');
    }

    function closeDuaModal() {
        duaModal.classList.remove('active');
    }

    // ===========================
    // Nova Modal
    // ===========================
    function showNovaModal(name) {
        novaTitle.textContent = `${name}, you deserve Infinite Salami!`;
        novaSubLove.textContent = `Eid Mubarak ${name}! Infinite love for you ♾️`;
        novaInputSection.classList.remove('hidden');
        novaDisplay.classList.add('hidden');
        novaAmountInput.value = '';
        novaModal.classList.add('active');
        launchNovaConfetti();
    }

    function closeNovaModal() {
        novaModal.classList.remove('active');
        clearConfetti();
    }

    function launchNovaConfetti() {
        clearConfetti();
        const NOVA_COLORS = ['#FFD700', '#FF69B4', '#C92B7A', '#FFF8E7', '#FF1493', '#FFB6C1'];
        for (let i = 0; i < 70; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.top = '-10px';
            piece.style.backgroundColor = NOVA_COLORS[Math.floor(Math.random() * NOVA_COLORS.length)];
            piece.style.width  = (Math.random() * 10 + 6) + 'px';
            piece.style.height = (Math.random() * 10 + 6) + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay    = (Math.random() * 1.2) + 's';
            piece.style.borderRadius = Math.random() > 0.3 ? '50%' : '2px';
            piece.style.opacity = Math.random() * 0.5 + 0.5;
            novaModal.appendChild(piece);
        }
    }

    // ===========================
    // Confetti System (CSS-based)
    // ===========================
    const CONFETTI_COLORS = ['#00A86B', '#FFD700', '#FF6B6B', '#7B2D8E', '#FFF8E7', '#E84545'];

    function launchConfetti(count, isGold) {
        clearConfetti();
        const container = moneyModal; // use the overlay as container

        for (let i = 0; i < count; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.top = '-10px';
            piece.style.backgroundColor = isGold
                ? (Math.random() > 0.5 ? '#FFD700' : '#FFF8E7')
                : CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
            piece.style.width = (Math.random() * 8 + 6) + 'px';
            piece.style.height = (Math.random() * 8 + 6) + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay = (Math.random() * 1) + 's';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.opacity = Math.random() * 0.5 + 0.5;

            container.appendChild(piece);
        }
    }

    function clearConfetti() {
        const pieces = document.querySelectorAll('.confetti-piece');
        pieces.forEach(p => p.remove());
    }

    // ===========================
    // Event Listeners
    // ===========================
    spinBtn.addEventListener('click', spin);

    // Enter key to spin
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') spin();
    });

    // Close modals
    moneyCloseBtn.addEventListener('click', closeMoneyModal);
    duaCloseBtn.addEventListener('click', closeDuaModal);
    novaCloseBtn.addEventListener('click', closeNovaModal);

    novaConfirmBtn.addEventListener('click', () => {
        const raw = novaAmountInput.value.trim();
        if (!raw || isNaN(raw) || Number(raw) <= 0) {
            novaAmountInput.style.boxShadow = '4px 4px 0 #FF1493';
            setTimeout(() => novaAmountInput.style.boxShadow = '', 1000);
            return;
        }
        novaFinalAmount.textContent = `৳${Number(raw).toLocaleString()}`;
        novaInputSection.classList.add('hidden');
        novaDisplay.classList.remove('hidden');
        launchNovaConfetti();
    });

    // Close on overlay click
    moneyModal.addEventListener('click', (e) => {
        if (e.target === moneyModal) closeMoneyModal();
    });
    duaModal.addEventListener('click', (e) => {
        if (e.target === duaModal) closeDuaModal();
    });
    novaModal.addEventListener('click', (e) => {
        if (e.target === novaModal) closeNovaModal();
    });

    // ===========================
    // Init
    // ===========================
    function init() {
        drawWheel();
        // Redraw on resize
        window.addEventListener('resize', drawWheel);
    }

    // Wait for fonts to load before drawing
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(init);
    } else {
        window.addEventListener('load', init);
    }
})();
