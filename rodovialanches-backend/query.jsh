import java.sql.*;
String url = "jdbc:postgresql://localhost:5432/rodovialanches";
String user = "postgres";
String pass = "postgres";
try (Connection conn = DriverManager.getConnection(url, user, pass);
     Statement stmt = conn.createStatement();
     ResultSet rs = stmt.executeQuery("SELECT id, name, price, quantity FROM product ORDER BY id")) {
  while (rs.next()) {
    System.out.println(rs.getLong("id") + " | " + rs.getString("name") + " | " + rs.getDouble("price") + " | " + rs.getObject("quantity"));
  }
} catch (Exception e) {
  e.printStackTrace();
}
