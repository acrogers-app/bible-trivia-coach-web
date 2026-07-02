#!/bin/bash
set -e
cd /Volumes/Nvme4TB/projects/BibleTriviaCoach/bible-trivia-coach-web

echo "========================================"
echo " Phase 1: Bible Trivia Coach Data Fix"
echo "========================================"

# 1. Fix bad refs
echo ""
echo "[1/5] Fixing bad refs..."
node scripts/phase1_fix_bad_refs.mjs

# 2. Audit gaps
echo ""
echo "[2/5] Auditing gaps..."
node scripts/phase1_audit_gaps.mjs

# 3. Activate Python env
echo ""
echo "[3/5] Activating Python environment..."
source .venv/bin/activate

# 4. Generate — start with Priority 1 (Gospels/Acts/Psalms) only
#    Change --priority 1 to --all for full generation (takes hours)
echo ""
echo "[4/5] Generating questions (Priority 1 first, limit 20 chapters)..."
echo "      To run all gaps overnight: python3 scripts/phase1_generate.py --all"
python3 scripts/phase1_generate.py --priority 1 --limit 20

# 5. Merge + validate
echo ""
echo "[5/5] Merging into pack..."
node scripts/phase1_merge.mjs

# 6. Final build check
echo ""
echo "[6/5] Building to confirm no TypeScript errors..."
npm run build

echo ""
echo "========================================"
echo " Phase 1 complete!"
echo "========================================"
