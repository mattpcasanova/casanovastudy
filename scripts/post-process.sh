#!/bin/bash
# Post-process demo recordings: splice normal speed + timelapse generation + normal speed
#
# Usage: ./scripts/post-process.sh desktop   (or mobile)
#
# This script takes the raw .webm and creates a final .mp4 where the
# generation wait (~20-40s) is compressed into ~3s timelapse.
#
# You'll need to adjust SPLIT_START and SPLIT_END timestamps based on
# your actual recording. Watch the raw video first to find the timestamps.

set -e

VARIANT="${1:-desktop}"
INPUT="scripts/recordings/demo-${VARIANT}.webm"
OUTPUT="scripts/recordings/demo-${VARIANT}-final.mp4"

if [ ! -f "$INPUT" ]; then
  echo "Input not found: $INPUT"
  exit 1
fi

echo "Input: $INPUT"
echo ""
echo "Watch the raw video and note these timestamps (in seconds):"
echo "  SPLIT_START = when the generation screen appears"
echo "  SPLIT_END   = when the study guide page loads"
echo ""
read -p "SPLIT_START (e.g., 25): " SPLIT_START
read -p "SPLIT_END (e.g., 55): " SPLIT_END

echo ""
echo "Processing..."

# Part 1: Normal speed - before generation
ffmpeg -y -i "$INPUT" -t "$SPLIT_START" \
  -c:v libx264 -preset slow -crf 22 -an \
  scripts/recordings/_part1.mp4 2>/dev/null

# Part 2: Timelapse - generation phase (10x speed)
ffmpeg -y -i "$INPUT" -ss "$SPLIT_START" -t "$(echo "$SPLIT_END - $SPLIT_START" | bc)" \
  -vf "setpts=0.1*PTS" -c:v libx264 -preset slow -crf 22 -an \
  scripts/recordings/_part2.mp4 2>/dev/null

# Part 3: Normal speed - after generation (study guide scroll-through)
ffmpeg -y -i "$INPUT" -ss "$SPLIT_END" \
  -c:v libx264 -preset slow -crf 22 -an \
  scripts/recordings/_part3.mp4 2>/dev/null

# Create concat file
echo "file '_part1.mp4'" > scripts/recordings/_concat.txt
echo "file '_part2.mp4'" >> scripts/recordings/_concat.txt
echo "file '_part3.mp4'" >> scripts/recordings/_concat.txt

# Concatenate
ffmpeg -y -f concat -safe 0 -i scripts/recordings/_concat.txt \
  -c:v libx264 -preset slow -crf 22 \
  "$OUTPUT" 2>/dev/null

# Cleanup
rm -f scripts/recordings/_part1.mp4 scripts/recordings/_part2.mp4 scripts/recordings/_part3.mp4 scripts/recordings/_concat.txt

echo ""
echo "Done! Output: $OUTPUT"
echo "Duration: $(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT" 2>/dev/null)s"
