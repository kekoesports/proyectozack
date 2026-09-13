#!/bin/sh
set -eu
# All SocialPro builds should enter through this host-wide lock.
# No credentials in arguments, logs or images. Env files are BuildKit secrets only.
lock_dir="$HOME/.config/socialpro/build"
mkdir -p "$lock_dir"
chmod 700 "$lock_dir"
exec 9>"$lock_dir/global.lock"
flock -n 9 || { echo 'Another SocialPro build is running; try after it finishes.'; exit 1; }
builder=socialpro-bounded-builder
if ! docker buildx inspect "$builder" >/dev/null 2>&1; then
  docker buildx create --name "$builder" --driver docker-container --driver-opt memory=5g,cpu-quota=200000 >/dev/null
fi
docker buildx build --builder "$builder" --load "$@"
