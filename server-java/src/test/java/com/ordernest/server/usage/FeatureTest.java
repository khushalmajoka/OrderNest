package com.ordernest.server.usage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

class FeatureTest {

    // While both servers run, they must count exactly the same features
    @Test
    void sameListAsTheNodeServer() throws IOException {
        String node = Files.readString(Path.of("../server/utils/usageFeatures.js"));
        Matcher entry = Pattern
                .compile("\\{ key: \"([^\"]+)\", label: \"([^\"]+)\", group: \"([^\"]+)\", where: \"([^\"]+)\" \\}")
                .matcher(node);
        List<String> expected = new ArrayList<>();
        while (entry.find()) {
            expected.add(String.join("|", entry.group(1), entry.group(2), entry.group(3), entry.group(4)));
        }
        List<String> actual = Arrays.stream(Feature.values())
                .map(f -> String.join("|", f.key(), f.label(), f.group(), f.fromApp() ? "client" : "server"))
                .toList();
        assertEquals(expected, actual);
    }
}
