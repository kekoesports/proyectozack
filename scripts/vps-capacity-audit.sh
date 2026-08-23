#!/usr/bin/env bash
set -euo pipefail

# Auditoría de solo lectura para cerrar el gate de capacidad del VPS.
# No imprime secretos, direcciones IP, variables de entorno ni nombres de
# procesos. Exit 0 = cumple; exit 2 = no cumple alguno de los mínimos.

min_vcpus=4
min_mem_kib=$((8 * 1024 * 1024))
min_disk_free_pct=30

vcpus="$(nproc)"
mem_kib="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)"
swap_kib="$(awk '/^SwapTotal:/ { print $2 }' /proc/meminfo)"
read -r disk_size disk_available < <(df -B1 --output=size,avail / | tail -n 1)
disk_free_pct=$((disk_available * 100 / disk_size))
load_15m="$(awk '{ print $3 }' /proc/loadavg)"

mem_gib="$(awk -v kib="$mem_kib" 'BEGIN { printf "%.2f", kib / 1024 / 1024 }')"
swap_gib="$(awk -v kib="$swap_kib" 'BEGIN { printf "%.2f", kib / 1024 / 1024 }')"
disk_gib="$(awk -v bytes="$disk_size" 'BEGIN { printf "%.1f", bytes / 1024 / 1024 / 1024 }')"
disk_available_gib="$(awk -v bytes="$disk_available" 'BEGIN { printf "%.1f", bytes / 1024 / 1024 / 1024 }')"

printf 'vcpus=%s\n' "$vcpus"
printf 'memory_gib=%s\n' "$mem_gib"
printf 'swap_gib=%s\n' "$swap_gib"
printf 'disk_gib=%s\n' "$disk_gib"
printf 'disk_available_gib=%s\n' "$disk_available_gib"
printf 'disk_free_pct=%s\n' "$disk_free_pct"
printf 'load_15m=%s\n' "$load_15m"

gate=true
if ((vcpus < min_vcpus)); then gate=false; fi
if ((mem_kib < min_mem_kib)); then gate=false; fi
if ((disk_free_pct < min_disk_free_pct)); then gate=false; fi

printf 'capacity_gate=%s\n' "$gate"
[[ "$gate" == true ]] || exit 2
