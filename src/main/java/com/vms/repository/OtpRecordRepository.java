package com.vms.repository;

import com.vms.model.OtpRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRecordRepository extends MongoRepository<OtpRecord, String> {
    Optional<OtpRecord> findByRequestId(String requestId);
    void deleteByRequestId(String requestId);
}
