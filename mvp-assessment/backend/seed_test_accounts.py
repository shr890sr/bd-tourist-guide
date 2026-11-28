"""Create the predefined test accounts in the configured database."""

try:
    from .auth import hash_password
    from .database import SessionLocal
    from .models import User
except ImportError:  # Allow running directly from the backend directory.
    from auth import hash_password
    from database import SessionLocal
    from models import User


ACCOUNTS = (
    ("shakib3@test.com", "admin"),
    ("shakib2@test.com", "admin"),
    ("shakib@test.com", "user"),
    ("test@test.com", "user"),
    ("user@test.com", "user"),
)


def main() -> None:
    db = SessionLocal()
    try:
        password_hash = hash_password("Password123")
        for email, role in ACCOUNTS:
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user is not None:
                continue
            db.add(User(email=email, role=role, hashed_password=password_hash))
            print(f"Created {role} account: {email}")
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
