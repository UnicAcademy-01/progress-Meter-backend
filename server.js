const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const PDFDocument = require("pdfkit");
const multer = require("multer");
const path = require("path");

/// 🔥 STORAGE CONFIG
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
const app = express();
app.use(cors());
app.use(bodyParser.json());

/// ✅ PostgreSQL Connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "progressmeter",
  password: "root",
  port: 5432,
});

/// ✅ Root Route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/// ✅ Enquiry API (Insert + ENQ ID + PDF)
app.post("/enquiry", async (req, res) => {
  try {
    const data = req.body;

    /// ✅ ID GENERATION
    const result = await pool.query(
      "SELECT id FROM enquiry_form ORDER BY CAST(SUBSTRING(id, 4) AS INTEGER) DESC LIMIT 1",
    );

    let newId = "ENQ01";

    if (result.rows.length > 0) {
      let lastId = result.rows[0].id;
      let number = parseInt(lastId.replace("ENQ", ""));
      number++;
      newId = "ENQ" + number.toString().padStart(2, "0");
    }

    /// ✅ INSERT (MATCHED WITH FRONTEND)
    await pool.query(
      `INSERT INTO enquiry_form (
        id,
        student_name, dob, school_name, class_grade,

        contact_person, relationship, contact_phone, candidate,

        batch_mode, preferred_days, batch_timing,

        email,

        address, city, pincode,

        course, reference,
        previous_coaching, strengths,

        comments, created_date,

        enquiry_type, other_enquiry
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12,
        $13,
        $14,$15,$16,
        $17,$18,
        $19,$20,
        $21,$22,
        $23,$24
      )`,
      [
        newId,
        data.student_name,
        data.dob,
        data.school_name,
        data.class_grade,

        data.contact_person,
        data.relationship,
        data.contact_phone,
        data.candidate,

        data.batch_mode,
        data.preferred_days,
        data.batch_timing,

        data.email,

        data.address,
        data.city,
        data.pincode,

        data.course,
        data.reference,

        data.previous_coaching,
        data.strengths,

        data.comments,
        data.created_date,

        data.enquiry_type,
        data.other_enquiry,
      ],
    );
    const upper = (val) => {
      return val ? String(val).toUpperCase() : "-";
    };
    /// ================= PDF =================
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=enquiry.pdf");

    doc.pipe(res);

    /// 🔥 PAGE BORDER
    doc
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(1)
      .stroke("#5c6bc0");

    /// 🔥 HEADER
    const headerHeight = 80;
    doc.rect(0, 0, doc.page.width, headerHeight).fill("#5c6bc0");

    const centerY = headerHeight / 2;

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("UNIC ACADEMY", 0, centerY - 20, { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#e0e0e0")
      .text("Concept Clarity. Confidence. Consistent Results", {
        align: "center",
      });

    doc
      .fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#cfd8dc")
      .text("(Since 2013)", { align: "center" });

    /// 🔥 MAIN BOX
    const contentTop = 100;

    doc
      .roundedRect(
        40,
        contentTop,
        doc.page.width - 80,
        doc.page.height - contentTop - 40,
        10,
      )
      .stroke("#d0d5ff");

    /// 🔥 TITLE (CENTER FIX)
    doc.y = 115;

    doc
      .fillColor("#222")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("ENQUIRY FORM", 0, doc.y, { align: "center" });

    // 🔥 ADD THIS
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor("#666").text(`ENQUIRY ID: ${newId}`, 60);
    doc.moveDown(1);

    /// 🔥 SECTION + FIELD
    const startX = 60;

    const section = (title) => {
      const y = doc.y;

      doc
        .roundedRect(startX - 10, y, doc.page.width - 100, 20, 5)
        .fill("#eef1ff");

      doc
        .fillColor("#3949ab")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(title.toUpperCase(), startX, y + 4);

      doc.moveDown(1);
      doc.fillColor("#000");
    };

    const field = (label, value) => {
      const y = doc.y;

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555")
        .text(label.toUpperCase(), 70, y);

      doc.font("Helvetica-Bold").fillColor("#000").text(upper(value), 220, y);

      doc.moveDown(0.2);
    };

    /// ================= DATA =================

    section("Student Details");
    field("Name", data.student_name?.toUpperCase());
    field("DOB", data.dob);
    field("School Name", data.school_name);
    field("Class", data.class_grade);

    section("Contact Details");
    field("Contact Person", data.contact_person);
    field("Relationship", data.relationship);
    field("Phone", data.contact_phone);

    section("Course Information");
    field("Course", data.course);
    field("class Type", data.enquiry_type);

    if (data.enquiry_type === "Others") {
      field("Requirement", data.other_enquiry);
    }

    field("Batch Mode", data.batch_mode);
    field("Preferred Days", data.preferred_days);
    field("Batch Timing", data.batch_timing);

    section("Address");
    field("Address", data.address);
    field("City", data.city);
    field("Pincode", data.pincode);

    section("Additional Information");
    field("Potential Candidate", data.candidate);
    field("Reference", data.reference);
    field("Previous Coaching", data.previous_coaching);
    field("Student Histroy", data.strengths);
    field("Comments", data.comments);

    doc.moveDown(2);

    doc
      .fontSize(9)
      .fillColor("#888")
      .text(`Generated on: ${data.created_date}`, {
        align: "right",
      });

    doc.end();
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
/// ✅ Server Start
app.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server running...");
});
app.post("/application", upload.single("photo"), async (req, res) => {
  try {
    const data = req.body;
    const upper = (val) => {
      return val ? String(val).toUpperCase() : "-";
    };
    const photoPath = req.file ? req.file.filename : null;

    const contentTop = 110;

    /// 🔥 MONTH ID
    const monthMap = {
      0: "JAN",
      1: "FEB",
      2: "MAR",
      3: "APR",
      4: "MAY",
      5: "JUN",
      6: "JUL",
      7: "AUG",
      8: "SEP",
      9: "OCT",
      10: "NOV",
      11: "DEC",
    };

    const now = new Date();
    const month = monthMap[now.getMonth()];

    const result = await pool.query(
      "SELECT id FROM application_form WHERE id LIKE $1 ORDER BY id DESC LIMIT 1",
      [`UN${month}%`],
    );

    let newId = `UN${month}01`;

    if (result.rows.length > 0) {
      let lastId = result.rows[0].id;
      let num = parseInt(lastId.slice(5));
      num++;
      newId = `UN${month}${num.toString().padStart(2, "0")}`;
    }

    /// ✅ INSERT
    await pool.query(
      `INSERT INTO application_form (
        id,name,parent_name,email_student,email_parent,
        mobile_student,mobile_parent,address,dob,photo,
        is_10th_completed,board_10,mark_10,total_10,percent_10,year_10,spec_10,
        is_12th_completed,board_12,mark_12,total_12,percent_12,year_12,spec_12,
        enrolled_type,board_class,board_subject,
        comp_exam,comp_type,comp_class,comp_subject,attempt_count,
        relationship
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,$31,$32,
        $33
      )`,
      [
        newId,
        data.name,
        data.parent_name,
        data.email_student,
        data.email_parent,
        data.mobile_student,
        data.mobile_parent,
        data.address,
        data.dob,
        photoPath,
        data.is_10th_completed,
        data.board_10,
        data.mark_10,
        data.total_10,
        data.percent_10,
        data.year_10,
        data.spec_10,
        data.is_12th_completed,
        data.board_12,
        data.mark_12,
        data.total_12,
        data.percent_12,
        data.year_12,
        data.spec_12,
        data.enrolled_type,
        data.board_class,
        data.board_subject,
        data.comp_exam,
        data.comp_type,
        data.comp_class,
        data.comp_subject,
        data.attempt_count,
        data.relationship,
      ],
    );

    /// ================= PDF =================
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=application.pdf");

    doc.pipe(res);

    // 🔥 BORDER
    doc
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(1)
      .stroke("#5c6bc0");

    // 🔥 HEADER
    const headerHeight = 80;
    doc.rect(0, 0, doc.page.width, headerHeight).fill("#5c6bc0");

    const centerY = headerHeight / 2;

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("UNIC ACADEMY", 0, centerY - 22, { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#e0e0e0")
      .text("Concept Clarity. Confidence. Consistent Results", {
        align: "center",
      });

    doc
      .fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#cfd8dc")
      .text("(Since 2013)", { align: "center" });

    // 🔥 MAIN BOX
    doc
      .roundedRect(
        40,
        contentTop,
        doc.page.width - 80,
        doc.page.height - contentTop - 40,
        10,
      )
      .stroke("#d0d5ff");

    // 🔥 TITLE PERFECT CENTER
    doc.y = 115;

    doc
      .fillColor("#222")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("APPLICATION FORM", 0, doc.y, { align: "center" });

    // doc
    //   .moveTo(textX, doc.y + 18)
    //   .lineTo(textX + textWidth, doc.y + 18)
    //   .stroke("#222");

    doc.moveDown(1);

    // 🔥 ID
    doc.fontSize(10).fillColor("#666").text(`Application ID: ${newId}`, 60);

    // 🔥 PHOTO (NO OVERLAP)
    if (photoPath) {
      const imgX = doc.page.width - 120;
      const imgY = contentTop + 10;

      doc.rect(imgX - 2, imgY - 2, 84, 84).stroke("#999");

      doc.image(`uploads/${photoPath}`, imgX, imgY, {
        width: 80,
        height: 80,
      });
    }

    doc.moveDown(4);

    const startX = 60;

    const section = (title) => {
      const y = doc.y;

      doc
        .roundedRect(startX - 10, y, doc.page.width - 100, 20, 5)
        .fill("#eef1ff");

      doc
        .fillColor("#3949ab")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(title.toUpperCase(), startX, y + 4);

      doc.moveDown(1);
      doc.fillColor("#000");
    };

    const field = (label, value) => {
      const y = doc.y;

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555")
        .text(label.toUpperCase(), 70, y);

      doc.font("Helvetica-Bold").fillColor("#000").text(upper(value), 220, y);

      doc.moveDown(0.3);
    };

    /// STUDENT
    section("Student Details");
    field("Name", upper(data.name));
    field("Parent", data.parent_name);
    field("Relationship", data.relationship);
    field("DOB", data.dob);
    field("Mobile", data.mobile_student);

    /// EDUCATION
    section("Education");

    field("10th Completed", data.is_10th_completed);
    field("10th Board", data.board_10);
    field("10th Specialisation", data.spec_10);
    field("10th Marks", `${data.mark_10 || "-"} / ${data.total_10 || "-"}`);
    field("10th %", data.percent_10);
    field("10th Year", data.year_10);

    field("12th Completed", data.is_12th_completed);
    field("12th Board", data.board_12);
    field("12th Specialisation", data.spec_12);
    field("12th Marks", `${data.mark_12 || "-"} / ${data.total_12 || "-"}`);
    field("12th %", data.percent_12);
    field("12th Year", data.year_12);

    /// COURSE
    section("Course");
    field("Type", data.enrolled_type);
    field("Board Class", data.board_class);
    field("Subject", data.board_subject);

    /// COMPETITIVE
    section("Competitive");
    field("Exam", data.comp_exam);
    field("Type", data.comp_type);
    field("Attempts", data.attempt_count);

    doc.moveDown();

    doc
      .fontSize(9)
      .fillColor("#888")
      .text(`Generated on: ${new Date().toLocaleDateString()}`, {
        align: "right",
      });

    doc.end();
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/tuition", async (req, res) => {
  try {
    const data = req.body;

    /// 🔥 UPPER FUNCTION (VERY IMPORTANT)
    const upper = (val) => {
      return val ? String(val).toUpperCase() : "-";
    };

    const query = `
      INSERT INTO tuition_form (
        name, student_id, class,
        subject1, subject2,
        content1, content2,
        numerical1, numerical2,
        in_time, out_time, duration,
        homework, instructions, assigned_datetime, deadline,
        performance_rating, student_doubts,
        tutor_remarks, next_topics,
        attendance, late_reason
      )
      VALUES (
        $1,$2,$3,
        $4,$5,
        $6,$7,
        $8,$9,
        $10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,
        $19,$20,
        $21,$22
      )
    `;

    const values = [
      data.name,
      data.student_id,
      data.class,
      data.subject1,
      data.subject2,
      data.content1,
      data.content2,
      data.numerical1,
      data.numerical2,
      data.in_time || null,
      data.out_time || null,
      data.duration,
      data.homework,
      data.instructions,
      data.assigned_datetime || null,
      data.deadline || null,
      data.performance_rating,
      data.student_doubts,
      data.tutor_remarks,
      data.next_topics,
      data.attendance,
      data.late_reason,
    ];

    await pool.query(query, values);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=tuition.pdf");

    doc.pipe(res);

    // 🔥 BORDER
    doc
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .lineWidth(1)
      .stroke("#5c6bc0");

    // 🔥 HEADER
    const headerHeight = 80;
    doc.rect(0, 0, doc.page.width, headerHeight).fill("#5c6bc0");

    const centerY = headerHeight / 2;

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("UNIC ACADEMY", 0, centerY - 20, { align: "center" });

    doc
      .fontSize(10)
      .fillColor("#e0e0e0")
      .text("CONCEPT CLARITY. CONFIDENCE. CONSISTENT RESULTS", {
        align: "center",
      });

    doc
      .fontSize(9)
      .font("Helvetica-Oblique")
      .fillColor("#cfd8dc")
      .text("(SINCE 2013)", { align: "center" });

    // 🔥 CONTENT BOX
    const contentTop = 100;
    doc
      .roundedRect(
        40,
        contentTop,
        doc.page.width - 80,
        doc.page.height - contentTop - 40,
        10,
      )
      .stroke("#d0d5ff");

    // 🔥 TITLE
    doc.y = 115;

    doc
      .fillColor("#222")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("DAILY CLASS REPORT", 20, doc.y, { align: "center" });

    doc.moveDown(1.5);

    // 🔥 SECTION
    const startX = 60;

    const section = (title) => {
      doc.moveDown(1);

      const y = doc.y;

      doc
        .roundedRect(startX - 10, y, doc.page.width - 100, 20, 5)
        .fill("#eef1ff");

      doc
        .fillColor("#3949ab")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(title.toUpperCase(), startX, y + 4);

      doc.moveDown(1);
      doc.fillColor("#000");
    };

    const field = (label, value) => {
      const y = doc.y;

      doc.fontSize(10).fillColor("#555").text(label.toUpperCase(), 70, y);

      doc.font("Helvetica-Bold").fillColor("#000").text(upper(value), 220, y);

      doc.moveDown(0.1);
    };

    // 🔥 DATA
    section("Student Details");
    field("Name", data.name);
    field("Student ID", data.student_id);
    field("Class", data.class);

    section("Subjects");
    field("Subject 1", data.subject1);
    field("Content 1", data.content1);
    field("Numericals 1", data.numerical1);

    field("Subject 2", data.subject2);
    field("Content 2", data.content2);
    field("Numericals 2", data.numerical2);

    section("Session Details");
    field("In Time", data.in_time);
    field("Out Time", data.out_time);
    field("Duration", data.duration);

    section("Attendance");
    field("Status", data.attendance);

    if (data.attendance === "Late") {
      field("Late Reason", data.late_reason);
    }

    section("Home Work / Assignment");
    field("Practice", data.homework);
    field("Instructions", data.instructions);
    field("Assigned", data.assigned_datetime);
    field("Deadline", data.deadline);

    section("Remarks");
    field("Student Doubts", data.student_doubts);
    field("Tutor Remarks", data.tutor_remarks);
    field("Next Topics", data.next_topics);

    doc.moveDown(2);

    doc
      .fontSize(9)
      .fillColor("#888")
      .text(`GENERATED ON: ${new Date().toLocaleString()}`, {
        align: "right",
      });

    doc.end();
  } catch (err) {
    console.error("❌ ERROR:", err);

    // 🔥 IMPORTANT FIX (avoid crash)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});
