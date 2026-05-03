package com.vms.repository;

import com.vms.model.VisitRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VisitRequestRepository extends MongoRepository<VisitRequest, String> {
    List<VisitRequest> findByHostEmployeeId(String hostEmployeeId);
    List<VisitRequest> findByEmailIgnoreCase(String email);
    List<VisitRequest> findByStatus(String status);
    long countByStatus(String status);
}
