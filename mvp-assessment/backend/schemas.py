from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class DestinationFields(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=5, max_length=5000)
    location: str = Field(min_length=2, max_length=160)
    image_url: HttpUrl | None = None


class DestinationCreate(DestinationFields):
    pass


class DestinationUpdate(DestinationFields):
    pass


class DestinationRead(DestinationFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
