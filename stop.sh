#!/bin/bash
# ============================================================
#  MediCore HMS — Stop All Services (Docker)
# ============================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       MediCore HMS — Stopping        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Stopping all containers...${NC}"
docker compose down

echo -e "\n${GREEN}All MediCore services stopped.${NC}"
echo -e "  To start again: ${CYAN}./start.sh${NC}"
echo -e "  To remove data: ${CYAN}docker compose down -v${NC}"
