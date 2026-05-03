package com.vms.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Document(collection = "visitors")
public class Visitor {
    @Id
    private String id;
    
    private String fullName;
    private String email;
    private String phone;
    private String purposeOfVisit;
    private String company;
    private String hostUsername; // Unique ID of the host employee
    private String hostName; // Display name of the host employee
    private String registeredBy; // User ID who registered the visitor
    private String visitRequestId; // Linked public visit request, when created through approval workflow
    
    private VisitorStatus status; // PENDING, PRE_APPROVED, APPROVED, REJECTED
    
    private String photoUrl;
    private String qrCodeUrl;
    
    private LocalDateTime expectedVisitTime;
    private LocalDateTime visitEndTime;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
