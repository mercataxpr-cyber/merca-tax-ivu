import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import javax.imageio.ImageIO;

// One approved visual identity. Native image sizes are technical derivatives only.
class GenerateApprovedIcons {
  static BufferedImage source;
  static Path root;

  static BufferedImage render(int width, int height, int iconSize) {
    BufferedImage canvas = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g = canvas.createGraphics();
    g.setColor(Color.WHITE);
    g.fillRect(0, 0, width, height);
    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
    g.drawImage(source, (width - iconSize) / 2, (height - iconSize) / 2, iconSize, iconSize, null);
    g.dispose();
    return canvas;
  }

  static void write(String relativePath, BufferedImage image) throws Exception {
    Path target = root.resolve(relativePath);
    Files.createDirectories(target.getParent());
    if (!ImageIO.write(image, "png", target.toFile())) {
      throw new IllegalStateException("PNG encoder not available: " + target);
    }
  }

  public static void main(String[] args) throws Exception {
    System.setProperty("java.awt.headless", "true");
    root = Paths.get(args.length > 0 ? args[0] : ".").toAbsolutePath();
    source = ImageIO.read(root.resolve("icon-512.png").toFile());
    if (source == null || source.getWidth() != 512 || source.getHeight() != 512) {
      throw new IllegalStateException("Expected the approved root 512x512 icon-512.png");
    }

    String[] densities = {"ldpi", "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"};
    int[] launcher = {36, 48, 72, 96, 144, 192};
    int[] foreground = {81, 108, 162, 216, 324, 432};
    for (int i = 0; i < densities.length; i++) {
      String prefix = "android/app/src/main/res/mipmap-" + densities[i] + "/";
      BufferedImage launch = render(launcher[i], launcher[i], launcher[i]);
      write(prefix + "ic_launcher.png", launch);
      write(prefix + "ic_launcher_round.png", launch);
      write(prefix + "ic_launcher_foreground.png", render(foreground[i], foreground[i], foreground[i]));
    }

    write("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", render(1024, 1024, 1024));
    String splashDir = "ios/App/App/Assets.xcassets/Splash.imageset/";
    String[] splashFiles = {"Default@1x~universal~anyany.png", "Default@2x~universal~anyany.png", "Default@3x~universal~anyany.png", "Default@1x~universal~anyany-dark.png", "Default@2x~universal~anyany-dark.png", "Default@3x~universal~anyany-dark.png"};
    BufferedImage splash = render(2732, 2732, 520);
    for (String file : splashFiles) write(splashDir + file, splash);
    System.out.println("APPROVED_ICON_ONLY=PASS: Android and iOS resources derived from icon-512.png");
  }
}
