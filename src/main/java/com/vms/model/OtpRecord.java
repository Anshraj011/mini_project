package com.vms.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "otp_records")
public class OtpRecord {
    @Id
    private String id;
    private String requestId;
    private String email;
    private String otp;
    private LocalDateTime expiresAt;
    private String status;
}
