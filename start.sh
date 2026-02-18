#!/bin/bash
# ============================================================
#  MediCore HMS — Start All Services (Docker)
# ============================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       MediCore HMS — Starting        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"

# Check Docker is running
if ! docker info &>/dev/null; then
    echo -e "${RED}✗ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Building and starting all containers...${NC}"
echo -e "  (This may take a few minutes on first run)\n"

docker compose up -d --build

echo -e "\n${YELLOW}Waiting for services to be healthy...${NC}"

# Wait for backend to be ready (up to 60s)
echo -n "  Backend  "
for i in $(seq 1 30); do
    if curl -sf http://localhost:5000/api/health &>/dev/null; then
        echo -e " ${GREEN}✓ ready${NC}"
        break
    fi
    sleep 2
    echo -n "."
    if [ "$i" -eq 30 ]; then echo -e " ${YELLOW}(still starting — check logs)${NC}"; fi
done

# Wait for AI service
echo -n "  AI Svc   "
for i in $(seq 1 20); do
    if curl -sf http://localhost:8000/health/ping &>/dev/null; then
        echo -e " ${GREEN}✓ ready${NC}"
        break
    fi
    sleep 2
    echo -n "."
    if [ "$i" -eq 20 ]; then echo -e " ${YELLOW}(still starting — check logs)${NC}"; fi
done

# Frontend is always ready once container is up
echo -e "  Frontend  ${GREEN}✓ ready${NC}"

echo -e "\n${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         All Services Running!        ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  🌐 Frontend  : http://localhost:3000 ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  🔧 Backend   : http://localhost:5000 ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  🤖 AI Service: http://localhost:8000 ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  Logs : docker compose logs -f        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Stop : ./stop.sh                     ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
