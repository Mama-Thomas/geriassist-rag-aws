from pathlib import Path
from dotenv import load_dotenv
import os
import sqlalchemy

# Dynamically find project root and load .env
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(BASE_DIR / ".env")


DATABASE_URL = (
    f"postgresql://{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:"
    f"{os.getenv('DB_PORT')}/"
    f"{os.getenv('DB_NAME')}"
)

engine = sqlalchemy.create_engine(DATABASE_URL)

def test_connection():
    with engine.connect() as conn:
        result = conn.execute(sqlalchemy.text("SELECT version()"))
        print("Connected to RDS!")
        print(result.fetchone()[0])

if __name__ == "__main__":
    test_connection()
