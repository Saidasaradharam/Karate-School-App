from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.models import ActiveBeltGrade

router = APIRouter(prefix="/belt-grades", tags=["Belt Grades"])

@router.get("/public")
def get_active_belt_grades(db: Session = Depends(get_db)):
    grades = db.query(ActiveBeltGrade).filter(ActiveBeltGrade.is_active == True).all()
    return [g.grade for g in grades]