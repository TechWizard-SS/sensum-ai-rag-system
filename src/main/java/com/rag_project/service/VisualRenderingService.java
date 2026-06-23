package com.rag_project.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

@Service
@Slf4j
public class VisualRenderingService {

    /**
     * Универсальный метод рендеринга.
     * Сам определяет формат документа и возвращает PNG в виде байтов.
     */
    public byte[] renderPage(byte[] fileData, int pageNum, String fileName) {
        if (fileData == null || fileName == null) return null;

        String extension = fileName.toLowerCase();
        if (extension.endsWith(".pdf")) {
            return renderPdfPage(fileData, pageNum);
        } else if (extension.endsWith(".pptx")) {
            return renderPptxSlide(fileData, pageNum);
        }

        log.warn("Формат файла {} не поддерживается для визуализации", fileName);
        return null;
    }

    private byte[] renderPdfPage(byte[] pdfData, int pageNum) {
        try (PDDocument document = Loader.loadPDF(new org.apache.pdfbox.io.RandomAccessReadBuffer(pdfData))) {
            if (pageNum > document.getNumberOfPages() || pageNum < 1) return null;

            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(pageNum - 1, 100);
            return toPngBytes(image);
        } catch (Exception e) {
            log.error("Критическая ошибка PDFBox: {}", e.getMessage());
            return null;
        }
    }

    private byte[] renderPptxSlide(byte[] pptxData, int slideNum) {
        try (XMLSlideShow ppt = new XMLSlideShow(new ByteArrayInputStream(pptxData))) {
            if (slideNum > ppt.getSlides().size() || slideNum < 1) return null;

            XSLFSlide slide = ppt.getSlides().get(slideNum - 1);
            Dimension pgsize = ppt.getPageSize();

            BufferedImage img = new BufferedImage(pgsize.width, pgsize.height, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = img.createGraphics();

            graphics.setPaint(Color.white);
            graphics.fill(new Rectangle2D.Float(0, 0, pgsize.width, pgsize.height));

            slide.draw(graphics);

            return toPngBytes(img);
        } catch (Exception e) {
            log.error("Ошибка рендеринга PPTX (слайд {}): {}", slideNum, e.getMessage());
            return null;
        }
    }

    private byte[] toPngBytes(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        return baos.toByteArray();
    }
}
