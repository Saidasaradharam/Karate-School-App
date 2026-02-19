from database import SessionLocal, engine
from models.models import *
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password):
    return pwd_context.hash(password)

def seed():
    db = SessionLocal()
    try:
        # Branches
        branch1 = Branch(name="Chennai Central", location="Chennai", is_active=True)
        branch2 = Branch(name="Chennai West", location="Porur", is_active=True)
        db.add_all([branch1, branch2])
        db.commit()
        db.refresh(branch1)
        db.refresh(branch2)

        # Super Admin
        super_admin = User(email="superadmin@karate.com", hashed_password=hash_password("super123"), role=UserRole.super_admin, branch_id=branch1.id)

        # Admins
        admin1 = User(email="admin1@karate.com", hashed_password=hash_password("admin123"), role=UserRole.admin, branch_id=branch1.id)
        admin2 = User(email="admin2@karate.com", hashed_password=hash_password("admin123"), role=UserRole.admin, branch_id=branch2.id)

        # Students
        student_user1 = User(email="student1@karate.com", hashed_password=hash_password("student123"), role=UserRole.student, branch_id=branch1.id)
        student_user2 = User(email="student2@karate.com", hashed_password=hash_password("student123"), role=UserRole.student, branch_id=branch1.id)
        student_user3 = User(email="student3@karate.com", hashed_password=hash_password("student123"), role=UserRole.student, branch_id=branch2.id)

        db.add_all([super_admin, admin1, admin2, student_user1, student_user2, student_user3])
        db.commit()
        db.refresh(student_user1)
        db.refresh(student_user2)
        db.refresh(student_user3)

        # Student profiles
        s1 = Student(user_id=student_user1.id, full_name="Ravi Kumar", dob="2005-06-15", parent_name="Kumar Sr", address="Anna Nagar", contact="9876543210", belt_grade="white", emergency_contact="9876543211")
        s2 = Student(user_id=student_user2.id, full_name="Priya Sharma", dob="2006-03-22", parent_name="Sharma Sr", address="T Nagar", contact="9876543212", belt_grade="yellow", emergency_contact="9876543213")
        s3 = Student(user_id=student_user3.id, full_name="Arjun Das", dob="2004-11-10", parent_name="Das Sr", address="Porur", contact="9876543214", belt_grade="blue", emergency_contact="9876543215")
        db.add_all([s1, s2, s3])
        db.commit()

        # Branch schedules
        # Branch 1: Saturday(5) and Sunday(6)
        # Branch 2: Monday(0), Wednesday(2), Friday(4)
        schedules = [
            BranchSchedule(branch_id=branch1.id, day_of_week=5),
            BranchSchedule(branch_id=branch1.id, day_of_week=6),
            BranchSchedule(branch_id=branch2.id, day_of_week=0),
            BranchSchedule(branch_id=branch2.id, day_of_week=2),
            BranchSchedule(branch_id=branch2.id, day_of_week=4),
        ]
        db.add_all(schedules)

        # Active belt grades
        grades = ["white","yellow","blue","orange","purple","purple-1","green","green-1","brown","brown-1","black-1","black-2","black-3","black-4","black-5","black-6","black-7","black-8","black-9","black-10"]
        for grade in grades:
            db.add(ActiveBeltGrade(grade=grade, is_active=True))

        db.commit()
        print("✅ Seed complete!")
        print("superadmin@karate.com / super123")
        print("admin1@karate.com / admin123")
        print("admin2@karate.com / admin123")
        print("student1@karate.com / student123")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()