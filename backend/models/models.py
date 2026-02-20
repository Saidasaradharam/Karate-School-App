from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum

# ----- Enums -----
class UserRole(str, enum.Enum):
    student = "student"
    admin = "admin"
    super_admin = "super_admin"

class FeeStatus(str, enum.Enum):
    pending = "pending"
    paid_online = "paid_online"
    paid_offline = "paid_offline"
    rejected = "rejected"

class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

# ----- Models -----
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile_picture = Column(String, nullable=True)  # stores URL from R2

    branch = relationship("Branch", back_populates="users")
    student = relationship("Student", back_populates="user", uselist=False)

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("User", back_populates="branch")
    branch_requests = relationship("BranchRequest", back_populates="branch")
    schedules = relationship("BranchSchedule", back_populates="branch")
    attendance = relationship("Attendance", back_populates="branch")

class BranchRequest(Base):
    __tablename__ = "branch_requests"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(RequestStatus), default=RequestStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="branch_requests")
    admin = relationship("User", foreign_keys=[requested_by])

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    parent_name = Column(String, nullable=True)
    address = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    belt_grade = Column(String, nullable=False)
    last_graduation_date = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="student")
    fee_records = relationship("FeeRecord", back_populates="student")
    offline_requests = relationship("OfflinePaymentRequest", back_populates="student")
    attendance = relationship("Attendance", back_populates="student")

class FeeRecord(Base):
    __tablename__ = "fee_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(Enum(FeeStatus), default=FeeStatus.pending)
    payment_type = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    receipt_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="fee_records")

class OfflinePaymentRequest(Base):
    __tablename__ = "offline_payment_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(RequestStatus), default=RequestStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="offline_requests")
    admin = relationship("User", foreign_keys=[admin_id])

class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_url = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    uploader = relationship("User", foreign_keys=[uploader_id])


class BranchSchedule(Base):
    __tablename__ = "branch_schedules"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="schedules")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)  # stored as "YYYY-MM-DD"
    status = Column(Enum("present", "absent", "informed_leave", name="attendance_status"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="attendance")
    branch = relationship("Branch", back_populates="attendance")
    admin = relationship("User", foreign_keys=[marked_by])

class RolePromotion(Base):
    __tablename__ = "role_promotions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)       # who got promoted
    promoted_by = Column(Integer, ForeignKey("users.id"), nullable=False)   # who promoted them
    old_role = Column(Enum(UserRole), nullable=False)
    new_role = Column(Enum(UserRole), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)  # which branch
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    promoted_by_user = relationship("User", foreign_keys=[promoted_by])
    branch = relationship("Branch")

class ActiveBeltGrade(Base):
    __tablename__ = "active_belt_grades"

    id = Column(Integer, primary_key=True, index=True)
    grade = Column(String, nullable=False, unique=True)  # plain string, not enum
    is_active = Column(Boolean, default=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

    updated_by_user = relationship("User", foreign_keys=[updated_by])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    triggered_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # who caused this notification
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    triggered_by_user = relationship("User", foreign_keys=[triggered_by])
