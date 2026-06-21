package com.medflow.dmrservice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MedicineDataInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!medicineTableExists()) {
            log.info("Skipping medicine seed: table 'medicine' does not exist yet.");
            return;
        }

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM medicine", Integer.class);
        if (count != null && count > 0) {
            log.info("Skipping medicine seed: medicine table already contains {} rows.", count);
            return;
        }

        log.info("Seeding medicine table from medicine.sql...");
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(false, false, "UTF-8", new ClassPathResource("medicine.sql"));
        populator.execute(jdbcTemplate.getDataSource());
        log.info("Medicine seed completed.");
    }

    private boolean medicineTableExists() {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'medicine'",
                Integer.class
        );
        return exists != null && exists > 0;
    }
}
