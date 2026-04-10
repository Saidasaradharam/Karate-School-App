from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum, JSON
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

class EventType(str, enum.Enum):
    belt_test = "belt_test"
    tournament = "tournament"
    other = "other"

class EventStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    completed = "completed"

class EventScope(str, enum.Enum):
    all_branches = "all_branches"
    specific_branches = "specific_branches"

class EventFeeStatus(str, enum.Enum):
    unpaid = "unpaid"
    pending_approval = "pending_approval"
    paid = "paid"
    not_applicable = "not_applicable"

class ResultType(str, enum.Enum):
    pass_fail = "pass_fail"
    prize = "prize"

class BroadcastStatus(str, enum.Enum):
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
    paid_at = Column(DateTime, nullable=True)  # null until actually paid


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
    paid_date = Column(String, nullable=True)  # student-reported payment date
    payment_type = Column(String, default="cash")
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

# Junction table
class AdminBranch(Base):
    __tablename__ = "admin_branches"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("User", foreign_keys=[admin_id])
    branch = relationship("Branch", foreign_keys=[branch_id])

class PromotionRequest(Base):
    __tablename__ = "promotion_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    student = relationship("Student", foreign_keys=[student_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    event_type = Column(Enum(EventType), nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=True)
    venue = Column(String, nullable=True)
    eligible_belt_grades = Column(JSON, default=[])
    registration_deadline = Column(String, nullable=True)
    has_sub_events = Column(Boolean, default=False)
    is_free = Column(Boolean, default=False)
    scope = Column(Enum(EventScope), default=EventScope.specific_branches)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(EventStatus), default=EventStatus.active)
    created_at = Column(DateTime, default=datetime.utcnow)

    sub_events = relationship("EventSubEvent", back_populates="event", cascade="all, delete-orphan")
    branches = relationship("EventBranch", back_populates="event", cascade="all, delete-orphan")
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")
    broadcast_requests = relationship("EventBroadcastRequest", back_populates="event", cascade="all, delete-orphan")


class EventSubEvent(Base):
    __tablename__ = "event_sub_events"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String, nullable=False)
    fee_amount = Column(Float, nullable=True)
    description = Column(String, nullable=True)

    event = relationship("Event", back_populates="sub_events")
    participants = relationship("EventParticipant", back_populates="sub_event", cascade="all, delete-orphan")
    results = relationship("EventResult", back_populates="sub_event")


class EventBranch(Base):
    __tablename__ = "event_branches"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)

    event = relationship("Event", back_populates="branches")
    branch = relationship("Branch")


class EventParticipant(Base):
    __tablename__ = "event_participants"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sub_event_id = Column(Integer, ForeignKey("event_sub_events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    selected_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    fee_status = Column(Enum(EventFeeStatus), default=EventFeeStatus.unpaid)
    fee_paid_at = Column(DateTime, nullable=True)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="participants")
    sub_event = relationship("EventSubEvent", back_populates="participants")
    student = relationship("Student")
    branch = relationship("Branch")


class EventPaymentRequest(Base):
    __tablename__ = "event_payment_requests"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sub_event_id = Column(Integer, ForeignKey("event_sub_events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    proof_note = Column(String, nullable=True)
    status = Column(String, default="pending") 
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event")
    sub_event = relationship("EventSubEvent")
    student = relationship("Student")


class EventResult(Base):
    __tablename__ = "event_results"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    sub_event_id = Column(Integer, ForeignKey("event_sub_events.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    result_type = Column(Enum(ResultType), nullable=False)
    result_value = Column(String, nullable=False)  # pass/fail/1st/2nd/3rd/participated
    notes = Column(String, nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event")
    sub_event = relationship("EventSubEvent", back_populates="results")
    student = relationship("Student")


class EventBroadcastRequest(Base):
    __tablename__ = "event_broadcast_requests"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String, nullable=True)
    status = Column(Enum(BroadcastStatus), default=BroadcastStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="broadcast_requests")