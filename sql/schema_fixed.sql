DROP DATABASE IF EXISTS edu_db;
CREATE DATABASE edu_db;
USE edu_db;

CREATE TABLE Users (
    idNumber INT PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    userPassword VARCHAR(255) NOT NULL,
    role ENUM('admin', 'lecturer', 'student') NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Students (
    studentID INT PRIMARY KEY,
    FOREIGN KEY (studentID) REFERENCES Users(idNumber) ON DELETE CASCADE
);

CREATE TABLE Lecturers (
    lecturerID INT PRIMARY KEY,
    FOREIGN KEY (lecturerID) REFERENCES Users(idNumber) ON DELETE CASCADE
);

CREATE TABLE Admins (
    adminID INT PRIMARY KEY,
    FOREIGN KEY (adminID) REFERENCES Users(idNumber) ON DELETE CASCADE
);

CREATE TABLE Course (
    courseID INT PRIMARY KEY AUTO_INCREMENT,
    courseCode VARCHAR(20) UNIQUE NOT NULL,
    courseName VARCHAR(100) NOT NULL,
    courseDescription TEXT,
    lecturerID INT NOT NULL,
    adminID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturerID) REFERENCES Lecturers(lecturerID),
    FOREIGN KEY (adminID) REFERENCES Admins(adminID)
);

CREATE TABLE Enroll (
    studentID INT NOT NULL,
    courseID INT NOT NULL,
    enrolledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(studentID, courseID),
    FOREIGN KEY (studentID) REFERENCES Students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (courseID) REFERENCES Course(courseID) ON DELETE CASCADE
);

CREATE TABLE Section (
    secNumber INT PRIMARY KEY AUTO_INCREMENT,
    sectionName VARCHAR(255) NOT NULL,
    courseID INT NOT NULL,
    sectionOrder INT DEFAULT 1,
    FOREIGN KEY (courseID) REFERENCES Course(courseID) ON DELETE CASCADE
);

CREATE TABLE Content (
    contentNumber INT PRIMARY KEY AUTO_INCREMENT,
    secNumber INT NOT NULL,
    contentName VARCHAR(100) NOT NULL,
    fileType ENUM('link', 'file', 'slides') NOT NULL,
    contentURL TEXT NOT NULL,
    uploadedBy INT NOT NULL,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (secNumber) REFERENCES Section(secNumber) ON DELETE CASCADE,
    FOREIGN KEY (uploadedBy) REFERENCES Lecturers(lecturerID)
);

CREATE TABLE CalendarEvent (
    eventNumber INT PRIMARY KEY AUTO_INCREMENT,
    courseID INT NOT NULL,
    eventName VARCHAR(100) NOT NULL,
    eventDescription TEXT,
    eventDate DATE NOT NULL,
    startTime TIME NULL,
    endTime TIME NULL,
    createdBy INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (courseID) REFERENCES Course(courseID) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Users(idNumber)
);

CREATE TABLE Forum (
    forumNumber INT PRIMARY KEY AUTO_INCREMENT,
    courseID INT NOT NULL,
    header VARCHAR(100) NOT NULL,
    createdBy INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (courseID) REFERENCES Course(courseID) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Users(idNumber)
);

CREATE TABLE Thread (
    threadNumber INT PRIMARY KEY AUTO_INCREMENT,
    forumNumber INT NOT NULL,
    createdBy INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    forumMessage TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES Users(idNumber),
    FOREIGN KEY (forumNumber) REFERENCES Forum(forumNumber) ON DELETE CASCADE
);

CREATE TABLE ThreadReply (
    replyID INT PRIMARY KEY AUTO_INCREMENT,
    threadNumber INT NOT NULL,
    parentReplyID INT NULL,
    createdBy INT NOT NULL,
    replyMessage TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (threadNumber) REFERENCES Thread(threadNumber) ON DELETE CASCADE,
    FOREIGN KEY (parentReplyID) REFERENCES ThreadReply(replyID) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Users(idNumber)
);

CREATE TABLE Assignment (
    assignmentNumber INT PRIMARY KEY AUTO_INCREMENT,
    courseID INT NOT NULL,
    assignmentName VARCHAR(255) NOT NULL,
    assignmentDescription TEXT,
    maxMarks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    dueDate DATETIME NULL,
    createdBy INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (courseID) REFERENCES Course(courseID) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Lecturers(lecturerID)
);

CREATE TABLE Submit (
    studentID INT NOT NULL,
    assignmentNumber INT NOT NULL,
    submissionText TEXT,
    submissionURL TEXT,
    submissionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    grade DECIMAL(5,2) NULL,
    feedback TEXT,
    gradedBy INT NULL,
    gradedDate DATETIME NULL,
    PRIMARY KEY(studentID, assignmentNumber),
    FOREIGN KEY (studentID) REFERENCES Students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (assignmentNumber) REFERENCES Assignment(assignmentNumber) ON DELETE CASCADE,
    FOREIGN KEY (gradedBy) REFERENCES Lecturers(lecturerID)
);

CREATE INDEX idx_enroll_course ON Enroll(courseID);
CREATE INDEX idx_course_lecturer ON Course(lecturerID);
CREATE INDEX idx_event_course_date ON CalendarEvent(courseID, eventDate);
CREATE INDEX idx_thread_forum ON Thread(forumNumber);
CREATE INDEX idx_reply_thread ON ThreadReply(threadNumber);
