from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from backend import schemas

app = FastAPI(
    title="BD Tourist Guide API",
    description="CRUD API for Bangladesh tourist destinations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary in-memory database for Vercel demo
fake_db = []
current_id = 1

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/destinations", response_model=list[schemas.DestinationRead])
def list_destinations():
    return fake_db

@app.get("/api/destinations/{destination_id}", response_model=schemas.DestinationRead)
def get_destination(destination_id: int):
    for d in fake_db:
        if d["id"] == destination_id:
            return d
    raise HTTPException(status_code=404, detail="Destination not found")

@app.post("/api/destinations", response_model=schemas.DestinationRead, status_code=status.HTTP_201_CREATED)
def create_destination(payload: schemas.DestinationCreate):
    global current_id
    new_dest = payload.model_dump()
    new_dest["id"] = current_id
    fake_db.append(new_dest)
    current_id += 1
    return new_dest

@app.put("/api/destinations/{destination_id}", response_model=schemas.DestinationRead)
def update_destination(destination_id: int, payload: schemas.DestinationUpdate):
    for i, d in enumerate(fake_db):
        if d["id"] == destination_id:
            updated_data = payload.model_dump(exclude_unset=True)
            fake_db[i].update(updated_data)
            return fake_db[i]
    raise HTTPException(status_code=404, detail="Destination not found")

@app.delete("/api/destinations/{destination_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_destination(destination_id: int):
    for i, d in enumerate(fake_db):
        if d["id"] == destination_id:
            del fake_db[i]
            return Response(status_code=status.HTTP_204_NO_CONTENT)
    raise HTTPException(status_code=404, detail="Destination not found")